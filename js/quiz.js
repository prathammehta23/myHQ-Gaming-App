import { rtdb } from './firebase-config.js';
import { ref, push, set, update, onValue, get, remove, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

const QUIZZES_ROOT = 'quizzes';

function generateSessionCode(length = 4) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let index = 0; index < length; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function normalizeOptions(options) {
  if (!Array.isArray(options)) return [];
  return options.map((option) => String(option ?? '').trim()).filter(Boolean);
}

function normalizeQuestion(question) {
  return {
    type: String(question?.type ?? 'multiple-choice').trim(),
    text: String(question?.text ?? '').trim(),
    options: normalizeOptions(question?.options),
    correct: Number(question?.correct ?? 0),
    time: Math.max(5, Number(question?.time ?? 15) || 15),
    explanation: String(question?.explanation ?? '').trim(),
    statements: normalizeOptions(question?.statements), // for Scales
  };
}

async function getSession(sid) {
  const snap = await get(ref(rtdb, `${QUIZZES_ROOT}/${sid}`));
  return snap.exists() ? snap.val() : null;
}

async function resolveUniqueCode() {
  let code = generateSessionCode(4);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const exists = await get(ref(rtdb, `${QUIZZES_ROOT}/${code}`));
    if (!exists.exists()) return code;
    code = generateSessionCode(attempt >= 4 ? 5 : 4);
  }
  return `${generateSessionCode(4)}${Date.now().toString().slice(-2)}`;
}

window.quiz = {
  createRoom: async (payload) => {
    const requestedCode = String(payload?.code ?? payload?.sessionId ?? '').trim().toUpperCase();
    const sid = requestedCode || await resolveUniqueCode();
    const existing = requestedCode ? await getSession(sid) : null;

    if (existing) {
      return sid;
    }

    const data = {
      title: payload.title || 'Interactive myHQ Room',
      state: 'lobby',
      createdAt: Date.now(),
      activeQuestionIndex: null,
      activeQuestionStartedAt: null,
      activeQuestionEndsAt: null,
      revealQuestionIndex: null,
      revealCorrectIndex: null,
      revealEndsAt: null,
      showResults: true,
      questions: [],
      scores: {},
      players: {}
    };
    (payload.questions || []).forEach((question) => {
      data.questions.push(normalizeQuestion(question));
    });
    await set(ref(rtdb, `${QUIZZES_ROOT}/${sid}`), data);
    return sid;
  },

  addQuestion: async (sid, question) => {
    const nextQuestion = normalizeQuestion(question);
    const session = await getSession(sid);
    if (!session) throw new Error('Room not found');
    const questions = Array.isArray(session.questions) ? session.questions.slice() : [];
    questions.push(nextQuestion);
    await set(ref(rtdb, `${QUIZZES_ROOT}/${sid}/questions`), questions);
    return questions.length - 1;
  },

  updateQuestion: async (sid, qIdx, question) => {
    const normalized = normalizeQuestion(question);
    const session = await getSession(sid);
    if (!session) throw new Error('Room not found');
    const questions = Array.isArray(session.questions) ? session.questions.slice() : [];
    if (qIdx >= 0 && qIdx < questions.length) {
      questions[qIdx] = normalized;
      await set(ref(rtdb, `${QUIZZES_ROOT}/${sid}/questions`), questions);
      return true;
    }
    return false;
  },

  reorderQuestions: async (sid, qIdx1, qIdx2) => {
    const session = await getSession(sid);
    if (!session) throw new Error('Room not found');
    const questions = Array.isArray(session.questions) ? session.questions.slice() : [];
    if (qIdx1 >= 0 && qIdx1 < questions.length && qIdx2 >= 0 && qIdx2 < questions.length) {
      const temp = questions[qIdx1];
      questions[qIdx1] = questions[qIdx2];
      questions[qIdx2] = temp;
      await set(ref(rtdb, `${QUIZZES_ROOT}/${sid}/questions`), questions);
      return true;
    }
    return false;
  },

  deleteQuestion: async (sid, qIdx) => {
    const session = await getSession(sid);
    if (!session) throw new Error('Room not found');
    const questions = Array.isArray(session.questions) ? session.questions.slice() : [];
    if (qIdx >= 0 && qIdx < questions.length) {
      questions.splice(qIdx, 1);
      await set(ref(rtdb, `${QUIZZES_ROOT}/${sid}/questions`), questions);
      return true;
    }
    return false;
  },

  onRoomUpdate: (sid, cb) => {
    const r = ref(rtdb, `${QUIZZES_ROOT}/${sid}`);
    const unsub = onValue(r, (snap) => {
      cb(snap.val());
    });
    return unsub;
  },

  joinRoom: async (sid, name, avatar = '👤', playerId = null) => {
    const pid = String(playerId || '').trim() || push(ref(rtdb, `${QUIZZES_ROOT}/${sid}/players`)).key;
    const existingScoreSnap = await get(ref(rtdb, `${QUIZZES_ROOT}/${sid}/scores/${pid}`));

    await set(ref(rtdb, `${QUIZZES_ROOT}/${sid}/players/${pid}`), { name, avatar, joinedAt: Date.now() });
    await update(ref(rtdb, `${QUIZZES_ROOT}/${sid}/scores/${pid}`), {
      name,
      avatar,
      score: existingScoreSnap.exists() ? Number(existingScoreSnap.val()?.score || 0) : 0
    });
    return pid;
  },

  leaveRoom: async (sid, pid) => {
    try { await remove(ref(rtdb, `${QUIZZES_ROOT}/${sid}/players/${pid}`)); } catch(e){}
  },

  submitAnswer: async (sid, qIdx, pid, answerIdx) => {
    const path = `${QUIZZES_ROOT}/${sid}/answers/${qIdx}/${pid}`;
    const session = await getSession(sid);
    if (!session || Number(session.activeQuestionIndex) !== Number(qIdx) || session.state !== 'question') return false;

    const question = Array.isArray(session.questions) ? session.questions[qIdx] : null;
    if (!question) return false;

    const answeredAt = Date.now();
    const isCorrect = Number(answerIdx) === Number(question.correct);
    let awardedPoints = 0;

    if (isCorrect) {
      const totalMs = Math.max(5000, Number(question.time || 15) * 1000);
      const startAt = Number(session.activeQuestionStartedAt || answeredAt);
      const remaining = Math.max(0, (startAt + totalMs) - answeredAt);
      const speedRatio = Math.min(1, Math.max(0, remaining / totalMs));
      awardedPoints = Math.round(500 + (speedRatio * 500));
    }

    const { committed, snapshot } = await runTransaction(ref(rtdb, path), (currentData) => {
      if (currentData === null) {
        return {
          answer: answerIdx,
          answeredAt,
          isCorrect,
          awardedPoints,
        };
      }
      return; // abort transaction if data already exists
    });

    return committed;
  },

  submitWordCloudAnswer: async (sid, qIdx, pid, words) => {
    const path = `${QUIZZES_ROOT}/${sid}/answers/${qIdx}/${pid}`;
    const session = await getSession(sid);
    if (!session || Number(session.activeQuestionIndex) !== Number(qIdx) || session.state !== 'question') return false;

    const existingAnswerSnap = await get(ref(rtdb, path));
    if (existingAnswerSnap.exists()) return false;

    await set(ref(rtdb, path), {
      words: Array.isArray(words) ? words.map(w => String(w).trim()).filter(Boolean) : [],
      answeredAt: Date.now()
    });
    return true;
  },

  submitOpenEndedAnswer: async (sid, qIdx, pid, text) => {
    const path = `${QUIZZES_ROOT}/${sid}/answers/${qIdx}/${pid}`;
    const session = await getSession(sid);
    if (!session || Number(session.activeQuestionIndex) !== Number(qIdx) || session.state !== 'question') return false;

    const existingAnswerSnap = await get(ref(rtdb, path));
    if (existingAnswerSnap.exists()) return false;

    await set(ref(rtdb, path), {
      text: String(text).trim(),
      answeredAt: Date.now()
    });
    return true;
  },

  submitScalesAnswer: async (sid, qIdx, pid, ratings) => {
    const path = `${QUIZZES_ROOT}/${sid}/answers/${qIdx}/${pid}`;
    const session = await getSession(sid);
    if (!session || Number(session.activeQuestionIndex) !== Number(qIdx) || session.state !== 'question') return false;

    const existingAnswerSnap = await get(ref(rtdb, path));
    if (existingAnswerSnap.exists()) return false;

    await set(ref(rtdb, path), {
      ratings: Array.isArray(ratings) ? ratings.map(Number) : [],
      answeredAt: Date.now()
    });
    return true;
  },

  submitRankingAnswer: async (sid, qIdx, pid, ranks) => {
    const path = `${QUIZZES_ROOT}/${sid}/answers/${qIdx}/${pid}`;
    const session = await getSession(sid);
    if (!session || Number(session.activeQuestionIndex) !== Number(qIdx) || session.state !== 'question') return false;

    const existingAnswerSnap = await get(ref(rtdb, path));
    if (existingAnswerSnap.exists()) return false;

    await set(ref(rtdb, path), {
      ranks: Array.isArray(ranks) ? ranks.map(Number) : [],
      answeredAt: Date.now()
    });
    return true;
  },

  submitQaQuestion: async (sid, name, avatar, text) => {
    const qaRef = push(ref(rtdb, `${QUIZZES_ROOT}/${sid}/qa`));
    await set(qaRef, {
      name: String(name),
      avatar: String(avatar),
      text: String(text).trim(),
      ts: Date.now(),
      answered: false
    });
    return qaRef.key;
  },

  toggleQaAnswered: async (sid, qid, answeredStatus) => {
    await update(ref(rtdb, `${QUIZZES_ROOT}/${sid}/qa/${qid}`), {
      answered: Boolean(answeredStatus)
    });
  },

  toggleShowResults: async (sid, showResults) => {
    await update(ref(rtdb, `${QUIZZES_ROOT}/${sid}`), {
      showResults: Boolean(showResults)
    });
  },

  startQuestion: async (sid, qIdx = null) => {
    const session = await getSession(sid);
    if (!session) throw new Error('Room not found');

    const questions = Array.isArray(session.questions) ? session.questions : [];
    
    // Progress naturally from active slide or last completed reveal/leaderboard slide index
    const currentIndex = session.activeQuestionIndex != null ? Number(session.activeQuestionIndex) : (session.revealQuestionIndex != null ? Number(session.revealQuestionIndex) : -1);
    const nextIndex = qIdx == null ? (Number.isInteger(currentIndex) ? currentIndex + 1 : 0) : Number(qIdx);
    const nextQuestion = questions[nextIndex];

    if (!nextQuestion) {
      await update(ref(rtdb, `${QUIZZES_ROOT}/${sid}`), {
        state: 'finished',
        activeQuestionIndex: null,
        activeQuestionStartedAt: null,
        activeQuestionEndsAt: null,
      });
      return null;
    }

    const startedAt = Date.now();
    await update(ref(rtdb, `${QUIZZES_ROOT}/${sid}`), {
      state: 'question',
      activeQuestionIndex: nextIndex,
      activeQuestionStartedAt: startedAt,
      activeQuestionEndsAt: startedAt + Math.max(5, Number(nextQuestion.time || 15) * 1000),
      revealQuestionIndex: null,
      revealCorrectIndex: null,
      revealEndsAt: null,
      showResults: false,
    });
    return nextIndex;
  },

  endQuestion: async (sid) => {
    const session = await getSession(sid);
    if (!session || !Number.isInteger(Number(session.activeQuestionIndex))) return null;
    const idx = Number(session.activeQuestionIndex);
    const question = Array.isArray(session.questions) ? session.questions[idx] : null;

    const updatedScores = { ...(session.scores || {}) };

    if (question && question.type === 'multiple-choice') {
      // First ensure all players in session exist in updatedScores with lastScore initialized
      if (session.players) {
        Object.keys(session.players).forEach(pid => {
          const currentScore = Number(updatedScores[pid]?.score || 0);
          updatedScores[pid] = {
            name: session.players[pid].name || 'Player',
            avatar: session.players[pid].avatar || '👤',
            lastScore: currentScore,
            roundPoints: 0,
            score: currentScore
          };
        });
      }

      const answersSnap = await get(ref(rtdb, `${QUIZZES_ROOT}/${sid}/answers/${idx}`));
      if (answersSnap.exists()) {
        const answers = answersSnap.val();
        Object.keys(answers).forEach((pid) => {
          const ans = answers[pid];
          if (ans.isCorrect && ans.awardedPoints > 0) {
            // Ensure they are initialized (just in case they joined late and aren't in session.players)
            if (!updatedScores[pid]) {
               updatedScores[pid] = { name: 'Player', avatar: '👤', lastScore: 0, roundPoints: 0, score: 0 };
            }
            updatedScores[pid].roundPoints = ans.awardedPoints;
            updatedScores[pid].score = updatedScores[pid].lastScore + ans.awardedPoints;
          }
        });
      }
    }

    await update(ref(rtdb, `${QUIZZES_ROOT}/${sid}`), {
      state: 'reveal',
      revealQuestionIndex: idx,
      revealCorrectIndex: question && question.type === 'multiple-choice' ? Number(question.correct || 0) : null,
      revealEndsAt: Date.now() + 5000,
      activeQuestionEndsAt: null,
      scores: updatedScores,
    });
    return idx;
  },

  showLeaderboard: async (sid) => {
    await update(ref(rtdb, `${QUIZZES_ROOT}/${sid}`), {
      state: 'leaderboard'
    });
    return true;
  },

  clearReveal: async (sid) => {
    await update(ref(rtdb, `${QUIZZES_ROOT}/${sid}`), {
      state: 'lobby',
      activeQuestionIndex: null,
      activeQuestionStartedAt: null,
      activeQuestionEndsAt: null,
      revealQuestionIndex: null,
      revealCorrectIndex: null,
      revealEndsAt: null,
    });
  },

  resetRoom: async (sid) => {
    await update(ref(rtdb, `${QUIZZES_ROOT}/${sid}`), {
      state: 'lobby',
      activeQuestionIndex: null,
      activeQuestionStartedAt: null,
      activeQuestionEndsAt: null,
      revealQuestionIndex: null,
      revealCorrectIndex: null,
      revealEndsAt: null,
      scores: {},
      players: {},
      answers: {},
      qa: {},
      showResults: true,
    });
  },

  // Maintain backwards compatibility with legacy window handles
  createSession: async (p) => window.quiz.createRoom(p),
  joinSession: async (sid, name) => window.quiz.joinRoom(sid, name),
  leaveSession: async (sid, pid) => window.quiz.leaveRoom(sid, pid),
  onSessionUpdate: (sid, cb) => window.quiz.onRoomUpdate(sid, cb),
  resetSession: async (sid) => window.quiz.resetRoom(sid)
};

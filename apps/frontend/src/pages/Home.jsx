import React, { useContext, useEffect, useRef, useState } from "react";
import { userDataContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import aiImg from "../assets/ai.gif";
import userImg from "../assets/user.gif";
import { motion, AnimatePresence } from "framer-motion";

function Home() {
  const { userData, serverUrl, setUserData, getGeminiResponse } =
    useContext(userDataContext);
  const navigate = useNavigate();

  const [listening, setListening] = useState(false);
  const [userText, setUserText] = useState("");
  const [aiText, setAiText] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [ready, setReady] = useState(false); // NEW: Prevent flicker before mount

  const recognitionRef = useRef(null);
  const isRecognizingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const mountedRef = useRef(true);
  const interruptRecognitionRef = useRef(null);

  // --- Clean text ---
  const sanitizeText = (text) =>
    text
      ?.replace(/\*\*|\*|_|#+|`+|>\s?/g, "")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .replace(/\n+/g, " ")
      .trim() || "";

  // --- Recognition controls ---
  const safeStartRecognition = () => {
    try {
      if (
        recognitionRef.current &&
        !isRecognizingRef.current &&
        !isSpeakingRef.current
      )
        recognitionRef.current.start();
    } catch (err) {
      if (err?.name !== "InvalidStateError") console.error(err);
    }
  };
  const safeStopRecognition = () => {
    try {
      if (recognitionRef.current && isRecognizingRef.current)
        recognitionRef.current.stop();
    } catch (err) {
      if (err?.name !== "InvalidStateError") console.error(err);
    }
  };

  // --- Speech synthesis ---
  const speak = (text) => {
    if (!text) return;
    const cleanText = sanitizeText(text);
    setAiText(cleanText);
    setSpeaking(true);

    const utter = new SpeechSynthesisUtterance(cleanText);
    utter.lang = "en-US";
    utter.rate = 1;
    utter.pitch = 1;

    utter.onstart = () => {
      isSpeakingRef.current = true;
      safeStopRecognition();
      startInterruptListener();
    };

    utter.onend = () => {
      stopInterruptListener();
      isSpeakingRef.current = false;
      setSpeaking(false);
      setTimeout(() => {
        if (!isRecognizingRef.current && mountedRef.current)
          safeStartRecognition();
      }, 700);
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  // --- Interrupt detection ---
  const startInterruptListener = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recog = new SpeechRecognition();
    recog.lang = "en-US";
    recog.continuous = true;
    recog.interimResults = false;

    recog.onresult = (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript
        .trim()
        .toLowerCase();
      const assistantName = (userData?.assistantName || "nova").toLowerCase();
      if (transcript.includes(assistantName)) {
        window.speechSynthesis.cancel();
        stopInterruptListener();
        isSpeakingRef.current = false;
        safeStartRecognition();
      }
    };

    recog.onerror = () => recog.stop();
    interruptRecognitionRef.current = recog;
    recog.start();
  };

  const stopInterruptListener = () => {
    try {
      interruptRecognitionRef.current?.stop();
    } catch {}
    interruptRecognitionRef.current = null;
  };

  // --- Mount setup ---
  useEffect(() => {
    mountedRef.current = true;
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      isRecognizingRef.current = true;
      setListening(true);
    };
    recognition.onend = () => {
      isRecognizingRef.current = false;
      setListening(false);
      if (!isSpeakingRef.current && mountedRef.current)
        setTimeout(() => safeStartRecognition(), 800);
    };
    recognition.onerror = () => {
      isRecognizingRef.current = false;
      setListening(false);
      if (!isSpeakingRef.current && mountedRef.current)
        setTimeout(() => safeStartRecognition(), 1200);
    };

    recognition.onresult = async (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript.trim();
      const assistantName = (userData?.assistantName || "nova").toLowerCase();
      if (transcript.toLowerCase().includes(assistantName)) {
        setUserText(transcript);
        setAiText("");
        safeStopRecognition();

        try {
          const data = await getGeminiResponse(transcript);
          speak(
            typeof data === "string"
              ? data
              : data?.response || "I'm thinking..."
          );
        } catch {
          speak("Sorry, I couldn't connect to the assistant.");
        } finally {
          setTimeout(() => setUserText(""), 700);
        }
      }
    };

    // Add small mount delay → prevents layout jump
    setTimeout(() => {
      setReady(true);
      safeStartRecognition();
      const name = userData?.name || "there";
      speak(`Hello ${name}, how can I help you today?`);
    }, 600);

    return () => {
      mountedRef.current = false;
      window.speechSynthesis.cancel();
      recognitionRef.current?.stop();
      interruptRecognitionRef.current?.stop();
    };
    // eslint-disable-next-line
  }, []);

  // --- Logout ---
  const handleLogOut = async () => {
    try {
      window.speechSynthesis.cancel();
      recognitionRef.current?.stop();
      speak("Goodbye, see you soon!");
      setTimeout(async () => {
        await axios.get(`${serverUrl}/api/auth/logout`, {
          withCredentials: true,
        });
        setUserData(null);
        navigate("/signin");
      }, 1200);
    } catch {
      setUserData(null);
      navigate("/signin");
    }
  };

  if (!ready)
    return (
      <div className="w-full h-screen flex justify-center items-center bg-black text-white text-lg">
        Initializing your assistant...
      </div>
    );

  // --- Main UI ---
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className={`relative w-full h-screen flex flex-col items-center justify-center overflow-hidden text-white p-4 transition-all duration-700 ${
        speaking
          ? "bg-gradient-to-br from-[#0b0221] via-[#24005a] to-[#000]"
          : "bg-gradient-to-br from-[#03001c] via-[#060042] to-[#000]"
      }`}
    >
      {/* Background Glow */}
      <motion.div
        animate={{
          opacity: speaking || listening ? [0.25, 0.6, 0.25] : 0.15,
          scale: speaking ? [1, 1.08, 1] : 1,
        }}
        transition={{ repeat: Infinity, duration: 3 }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_70%)]"
      />

      {/* Top buttons */}
      <div className="absolute top-5 right-5 flex gap-3 z-10">
        <button
          onClick={handleLogOut}
          className="px-5 py-2 bg-white text-black rounded-full font-semibold shadow-lg hover:shadow-white/40 hover:scale-105 transition-all"
        >
          Log Out
        </button>
        <button
          onClick={() => navigate("/customize")}
          className="px-5 py-2 bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white rounded-full font-semibold shadow-lg hover:scale-105 transition-all"
        >
          Customize
        </button>
      </div>

      {/* Assistant Display */}
      <motion.div
        animate={{ scale: listening ? 1.15 : 1 }}
        transition={{ duration: 0.5 }}
        className="relative rounded-3xl shadow-2xl border border-white/20 overflow-hidden w-[260px] h-[320px] sm:w-[300px] sm:h-[380px] flex justify-center items-center bg-white/5 backdrop-blur-2xl"
      >
        <motion.div
          animate={{
            scale: speaking ? [1, 1.08, 1] : [1],
            opacity: speaking ? [0.4, 0.7, 0.4] : 0.2,
          }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-fuchsia-500/20 blur-2xl rounded-3xl"
        />
        <img
          src={speaking ? aiImg : userData?.assistantImage || userImg}
          alt="Assistant"
          className="relative w-full h-full object-cover rounded-3xl z-10"
        />
      </motion.div>

      {/* Name */}
      <h1 className="text-2xl sm:text-3xl font-semibold mt-4 tracking-wide drop-shadow-lg">
        I'm{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-blue-400">
          {userData?.assistantName || "Nova"}
        </span>
      </h1>

      {/* Status light */}
      <div className="mt-3 flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full shadow-lg ${
            listening
              ? "bg-green-400 animate-pulse"
              : speaking
              ? "bg-blue-400 animate-pulse"
              : "bg-gray-400"
          }`}
        ></div>
        <p className="text-sm text-gray-300 tracking-wide">
          {listening ? "Listening..." : speaking ? "Speaking..." : "Idle"}
        </p>
      </div>

      {/* AI Text Display */}
      <div className="relative mt-6 w-full flex justify-center">
        <motion.div
          key={aiText || userText}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center text-base sm:text-lg max-w-[90vw] sm:max-w-[700px] font-medium leading-relaxed px-5 py-5 bg-white/10 backdrop-blur-md rounded-2xl overflow-y-auto max-h-[35vh] border border-white/10 shadow-inner scrollbar-thin scrollbar-thumb-white/20"
        >
          <AnimatePresence mode="wait">
            {userText && (
              <motion.p
                key="userText"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-fuchsia-300 italic mb-3"
              >
                “{userText}”
              </motion.p>
            )}
            {aiText && (
              <motion.p
                key="aiText"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-white text-lg sm:text-xl drop-shadow-md"
              >
                {aiText}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default Home;

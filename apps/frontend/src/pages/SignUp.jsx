import React, { useContext, useState } from "react";
import bg from "../assets/authBg.png";
import { IoEye, IoEyeOff } from "react-icons/io5";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { userDataContext } from "../context/UserContext";
import { AUTH } from "../services/auth";

function SignUp() {
  const [showPassword, setShowPassword] = useState(false);
  const { setUserData } = useContext(userDataContext);
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const result = await AUTH.SIGN_UP(form);
      setUserData(result.data);
      navigate("/customize");
    } catch (error) {
      console.log(error);
      setErr(error.response?.data?.message || "Signup failed. Try again.");
      setUserData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative w-full h-screen bg-cover bg-center flex items-center justify-center overflow-hidden"
      style={{ backgroundImage: `url(${bg})` }}
    >
      {/* 🌌 Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0028]/90 via-[#0a0028]/80 to-[#050019]/90 backdrop-blur-md"></div>

      {/* ✨ Animated glow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 5, repeat: Infinity }}
        className="absolute w-[600px] h-[600px] rounded-full bg-purple-600/30 blur-3xl"
      ></motion.div>

      {/* 🌈 Form Card */}
      <motion.form
        onSubmit={handleSignUp}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-[90%] max-w-[460px] bg-white/10 border border-white/20 backdrop-blur-lg rounded-3xl shadow-2xl px-8 py-10 flex flex-col items-center gap-5 text-white"
      >
        <motion.h1
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-3xl font-bold text-center mb-2"
        >
          Create Your <span className="text-blue-400">Assistant</span> Account
        </motion.h1>

        <p className="text-gray-300 text-center text-sm mb-4">
          Let’s set up your AI companion. It only takes a minute!
        </p>

        {/* Name */}
        <input
          type="text"
          name="name"
          placeholder="Full Name"
          className="w-full h-14 px-5 rounded-full bg-white/10 border border-white/20 text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
          required
          value={form.name}
          onChange={handleChange}
        />

        {/* Email */}
        <input
          type="email"
          name="email"
          placeholder="Email Address"
          className="w-full h-14 px-5 rounded-full bg-white/10 border border-white/20 text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
          required
          value={form.email}
          onChange={handleChange}
        />

        {/* Password */}
        <div className="relative w-full">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            className="w-full h-14 px-5 pr-12 rounded-full bg-white/10 border border-white/20 text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
            required
            value={form.password}
            onChange={handleChange}
          />
          {showPassword ? (
            <IoEyeOff
              className="absolute right-4 top-4 text-2xl text-gray-300 cursor-pointer hover:text-white transition"
              onClick={() => setShowPassword(false)}
            />
          ) : (
            <IoEye
              className="absolute right-4 top-4 text-2xl text-gray-300 cursor-pointer hover:text-white transition"
              onClick={() => setShowPassword(true)}
            />
          )}
        </div>

        {/* Error */}
        {err && (
          <p className="text-red-400 text-sm mt-2 bg-red-500/10 px-3 py-2 rounded-lg w-full text-center border border-red-400/30">
            {err}
          </p>
        )}

        {/* Button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
          className="mt-4 w-full h-14 bg-gradient-to-r from-blue-500 to-purple-500 font-semibold rounded-full shadow-lg hover:shadow-blue-400/30 text-white text-lg transition-all"
          disabled={loading}
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </motion.button>

        {/* Divider */}
        <div className="flex items-center gap-2 mt-6 w-full">
          <div className="h-px flex-1 bg-white/20" />
          <span className="text-gray-400 text-sm">or</span>
          <div className="h-px flex-1 bg-white/20" />
        </div>

        {/* Sign In link */}
        <p
          className="text-gray-300 text-sm mt-3 cursor-pointer hover:text-blue-400 transition"
          onClick={() => navigate("/signin")}
        >
          Already have an account?{" "}
          <span className="text-blue-400 font-medium">Sign In</span>
        </p>
      </motion.form>
    </div>
  );
}

export default SignUp;

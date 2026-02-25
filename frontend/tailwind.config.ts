import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      animationDelay: {
        "1000": "1s",
        "1500": "1.5s",
        "2000": "2s",
        "2500": "2.5s",
        "3000": "3s",
        "3500": "3.5s",
        "4000": "4s",
        "4500": "4.5s",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-6px)" },
          "40%, 80%": { transform: "translateX(6px)" },
        },
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" },
        },
        float: {
          "0%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
          "100%": { transform: "translateY(0px)" },
        },
        bookOpen: {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(-180deg)" },
        },
        bulbLight: {
          "0%,100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(0.95)" },
        },
        gearSpin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.6s ease-out",
        slideDown: "slideDown 0.6s ease-out",
        shake: "shake 0.5s ease-in-out",
        blob: "blob 7s infinite",
        float: "float 6s ease-in-out infinite",
        bookOpen: "bookOpen 3s ease-in-out infinite",
        bulbLight: "bulbLight 2s ease-in-out infinite",
        gearSpin: "gearSpin 3s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;

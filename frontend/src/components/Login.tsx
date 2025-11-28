import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import GlowBackground from "./GlowBackground";

const Login: React.FC = () => {
  const [email, setEmail] = useState("yanadobrayavtb@vtb.ru");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    
    const success = login(email, password);
    
    if (success) {
      navigate('/dashboard');
    } else {
      setError("Неверный email или пароль");
    }
  };

  return (
    <div className="bg-[#050505] overflow-hidden w-screen h-screen fixed inset-0">
      <GlowBackground />

      {/* Login form */}
      <main className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[526px] h-[328px]">
        <div className="absolute top-0 left-0 w-[522px] h-[328px] rounded-[20px] border border-solid border-[#312f2f] bg-[linear-gradient(180deg,rgba(33,32,32,1)_0%)]" />
        
        <h1 className="absolute top-[39px] left-[145px] [font-family:'Inter-Bold',Helvetica] font-bold text-white text-2xl tracking-[0] leading-[normal]">
          Добро пожаловать
        </h1>
        
        <p className="absolute top-[76px] left-[83px] w-[355px] [font-family:'Inter-Medium',Helvetica] font-medium text-[#4f4e4e] text-xs text-center tracking-[0] leading-[normal]">
          Для того чтобы ускорить работу вашей базы данных необходимо войти
        </p>

        {error && (
          <div className="absolute top-[105px] left-[66px] w-[389px] text-red-500 text-xs text-center [font-family:'Inter-Regular',Helvetica]">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex flex-col w-[389px] items-start gap-[7px] absolute top-[120px] left-[66px]"
        >
          <div className="relative w-[389px] h-[55px]">
            <label
              htmlFor="email"
              className="inline-flex items-center justify-center gap-2.5 px-1 py-0.5 absolute top-0 left-3 bg-[#212020] rounded z-10"
            >
              <span className="relative w-fit mt-[-1.00px] [font-family:'Inter-Regular',Helvetica] font-normal text-white text-sm tracking-[0] leading-[normal]">
                Email
              </span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex w-[389px] h-10 items-center gap-2.5 px-4 py-[11px] absolute top-[15px] left-0 bg-[#191818] rounded-[10px] border border-solid border-[#312f2f] [font-family:'Inter-Regular',Helvetica] font-normal text-[#383636] text-sm tracking-[0] leading-[normal]"
              required
              aria-label="Email"
            />
          </div>

          <div className="relative w-[389px] h-[55px]">
            <label
              htmlFor="password"
              className="inline-flex items-center justify-center gap-2.5 px-1 py-0.5 absolute top-0 left-3 bg-[#212020] rounded z-10"
            >
              <span className="relative w-fit mt-[-1.00px] [font-family:'Inter-Regular',Helvetica] font-normal text-white text-sm tracking-[0] leading-[normal]">
                Password
              </span>
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="*************"
              className="flex w-[389px] h-10 items-center gap-2.5 px-4 py-[11px] absolute top-[15px] left-0 bg-[#191818] rounded-[10px] border border-solid border-[#312f2f] [font-family:'Inter-Regular',Helvetica] font-normal text-[#383636] text-sm tracking-[0] leading-[normal] placeholder:text-[#383636]"
              required
              aria-label="Password"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2.5 px-[52px] py-2.5 absolute top-[137px] left-[119px] bg-[#191818] rounded-xl border border-solid border-[#312f2f] cursor-pointer hover:bg-[#212020] transition-colors"
          >
            <span className="relative w-fit mt-[-1.00px] [font-family:'Inter-Medium',Helvetica] font-medium text-white text-base text-center whitespace-nowrap tracking-[0] leading-[normal]">
              Войти
            </span>
          </button>
        </form>
      </main>
    </div>
  );
};

export default Login;


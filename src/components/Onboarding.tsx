import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { Compass, MapPin, Share2, FileText, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";

interface OnboardingProps {
  isDarkMode?: boolean;
}

export default function Onboarding({ isDarkMode }: OnboardingProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem("georoute_onboarding_seen");
    if (!done) {
      setShow(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("georoute_onboarding_seen", "true");
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className={cn(
              "relative w-full max-w-lg backdrop-blur-3xl rounded-[3.5rem] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden border transition-colors duration-500",
              isDarkMode 
                ? "bg-[#1C1C1E]/80 border-white/10" 
                : "bg-white/60 border-white/30"
            )}
          >
            <div className="p-8 md:p-14 space-y-10">
              <div className="flex justify-center">
                <div className={cn(
                  "w-24 h-24 backdrop-blur-xl rounded-full flex items-center justify-center shadow-lg border transition-colors",
                  isDarkMode ? "bg-white/10 border-white/20 text-white" : "bg-white/40 border-white/30 text-[#2C2C2C]"
                )}>
                  <Compass size={44} className="animate-spin-slow" />
                </div>
              </div>

              <div className="text-center space-y-4">
                <h2 className={cn(
                  "font-serif text-4xl tracking-tight transition-colors",
                  isDarkMode ? "text-white" : "text-[#2C2C2C]"
                )}>欢迎使用 GeoRoute Explorer</h2>
                <p className={cn(
                  "text-sm font-serif italic transition-colors",
                  isDarkMode ? "text-white/60" : "text-[#8b5e3c]/80"
                )}>粘贴旅游攻略链接，一键生成你的专属可视化自驾地图</p>
              </div>

              <div className="grid gap-6">
                <OnboardingItem 
                  icon={<MapPin size={20} />} 
                  title="多源抓取" 
                  desc="支持粘贴多达 5 个小红书、博客等链接，自动提取地标与路线。"
                  isDarkMode={isDarkMode}
                />
                <OnboardingItem 
                  icon={<Share2 size={20} />} 
                  title="一键分享" 
                  desc="生成的路线拥有唯一链接，可直接发给同伴，完美复现视角。"
                  isDarkMode={isDarkMode}
                />
                <OnboardingItem 
                  icon={<FileText size={20} />} 
                  title="离线攻略" 
                  desc="支持导出 Markdown 和 PDF，长途驾驶离线也能从容查看。"
                  isDarkMode={isDarkMode}
                />
              </div>

              <button
                onClick={handleClose}
                className={cn(
                  "w-full py-5 rounded-[1.5rem] font-serif font-bold text-lg flex items-center justify-center gap-3 hover:scale-[1.02] transition-all shadow-2xl",
                  isDarkMode 
                    ? "bg-white text-black shadow-white/5" 
                    : "bg-[#4a5d4e] text-white shadow-[#4a5d4e]/40"
                )}
              >
                开始探索 <ChevronRight size={20} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function OnboardingItem({ icon, title, desc, isDarkMode }: { icon: React.ReactNode, title: string, desc: string, isDarkMode?: boolean }) {
  return (
    <div className={cn(
      "flex gap-5 items-start p-5 rounded-[1.5rem] border transition-colors",
      isDarkMode ? "bg-white/5 border-white/10" : "bg-white/20 border-white/20"
    )}>
      <div className={cn("mt-1 transition-colors", isDarkMode ? "text-amber-200" : "text-[#4a5d4e]")}>{icon}</div>
      <div>
        <h4 className={cn("text-sm font-serif font-bold transition-colors", isDarkMode ? "text-white" : "text-[#2C2C2C]")}>{title}</h4>
        <p className={cn("text-[0.625rem] leading-relaxed mt-2 font-serif italic transition-colors", isDarkMode ? "text-white/40" : "text-[#2C2C2C]/50")}>{desc}</p>
      </div>
    </div>
  );
}

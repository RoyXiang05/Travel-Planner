import { FileText, Download, Share2 } from "lucide-react";
import { RoutePlanResponse } from "../types";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ExportToolsProps {
  plan: RoutePlanResponse;
  lang: string;
}

export default function ExportTools({ plan, lang }: ExportToolsProps) {
  const isZh = lang === "zh";

  const exportMarkdown = () => {
    const title = plan[lang === 'zh' ? 'name' : (lang === 'en' ? 'name_en' : 'name_ko')] || plan.name;
    const summary = plan[lang === 'zh' ? 'summary' : (lang === 'en' ? 'summary_en' : 'summary_ko')] || plan.summary;
    
    let md = `# ${title}\n\n`;
    md += `## Summary\n${summary}\n\n`;
    
    md += `## Checkpoints\n`;
    plan.checkpoints.forEach(cp => {
      md += `### ${cp.name} (Day ${cp.day})\n`;
      const notes = (cp as any)[lang === 'zh' ? 'notes' : (lang === 'en' ? 'notes_en' : 'notes_ko')] || cp.notes;
      const transport = (cp as any)[lang === 'zh' ? 'transport_recommendation' : (lang === 'en' ? 'transport_recommendation_en' : 'transport_recommendation_ko')] || cp.transport_recommendation;
      md += `* **Notes**: ${notes}\n`;
      md += `* **Transport**: ${transport}\n\n`;
    });

    if (plan.venues && plan.venues.length > 0) {
      md += `## Venues (Restaurants/Hotels)\n`;
      plan.venues.forEach(v => {
        md += `### ${v.name} (${v.type}, Day ${v.day})\n`;
        const desc = (v as any)[lang === 'zh' ? 'description' : (lang === 'en' ? 'description_en' : 'description_ko')] || v.description;
        const transport = (v as any)[lang === 'zh' ? 'transport_recommendation' : (lang === 'en' ? 'transport_recommendation_en' : 'transport_recommendation_ko')] || v.transport_recommendation;
        md += `* **Description**: ${desc}\n`;
        md += `* **Transport**: ${transport}\n\n`;
      });
    }

    if (plan.drivingTips && plan.drivingTips.length > 0) {
      md += `## Driving Warnings\n`;
      plan.drivingTips.forEach(tip => {
        md += `* **${tip.type}**: ${tip.message} (Source: ${tip.source || 'extracted'})\n`;
      });
    }

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_itinerary.md`;
    a.click();
    toast.success("Markdown exported!");
  };

  const exportPDF = async () => {
    const element = document.getElementById("itinerary-content");
    if (!element) {
      toast.error("Itinerary content not found");
      return;
    }

    const pdf = new jsPDF("p", "mm", "a4");
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: element.scrollWidth,
    });
    
    const imgData = canvas.toDataURL("image/png");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${plan.name.replace(/\s+/g, '_')}_itinerary.pdf`);
    toast.success("PDF exported!");
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Share link copied to clipboard!");
  };

  return (
    <div className="flex flex-wrap gap-3">
      <button 
        onClick={exportMarkdown}
        className="flex items-center gap-2 px-5 py-2.5 bg-white/40 backdrop-blur-xl border border-white/30 text-[#2C2C2C] rounded-2xl text-[0.625rem] font-serif font-bold hover:bg-white/60 transition-all shadow-sm"
      >
        <FileText size={14} className="opacity-60" /> {isZh ? "导出 MD" : "Export MD"}
      </button>
      <button 
        onClick={exportPDF}
        className="flex items-center gap-2 px-5 py-2.5 bg-white/40 backdrop-blur-xl border border-white/30 text-[#2C2C2C] rounded-2xl text-[0.625rem] font-serif font-bold hover:bg-white/60 transition-all shadow-sm"
      >
        <Download size={14} className="opacity-60" /> {isZh ? "导出 PDF" : "Export PDF"}
      </button>
      <button 
        onClick={copyShareLink}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#4a5d4e] text-white rounded-2xl text-[0.625rem] font-serif font-bold hover:opacity-90 transition-all shadow-lg shadow-[#4a5d4e]/20"
      >
        <Share2 size={14} /> {isZh ? "分享攻略" : "Share Link"}
      </button>
    </div>
  );
}

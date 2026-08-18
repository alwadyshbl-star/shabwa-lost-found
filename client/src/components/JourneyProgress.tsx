import { Check, ClipboardPlus, SearchCheck, ShieldCheck } from "lucide-react";

export type JourneyStage = "discover" | "report" | "match" | "recover";

const stages: { id: JourneyStage; label: string; icon: typeof ClipboardPlus }[] = [
  { id: "discover", label: "استكشف", icon: SearchCheck },
  { id: "report", label: "أضف بلاغًا", icon: ClipboardPlus },
  { id: "match", label: "راجع التطابق", icon: SearchCheck },
  { id: "recover", label: "تحقق واسترجع", icon: ShieldCheck },
];

export default function JourneyProgress({ active }: { active: JourneyStage }) {
  const activeIndex = stages.findIndex(stage => stage.id === active);
  return (
    <div className="journey-progress" aria-label="مراحل استرجاع الغرض">
      {stages.map((stage, index) => {
        const Icon = stage.icon;
        const isActive = index === activeIndex;
        const isComplete = index < activeIndex;
        return <div key={stage.id} className={`journey-step ${isActive ? "journey-step-active" : ""} ${isComplete ? "journey-step-complete" : ""}`}>
          <span className="journey-dot">{isComplete ? <Check size={13} strokeWidth={3} /> : <Icon size={14} />}</span>
          <span>{stage.label}</span>
        </div>;
      })}
    </div>
  );
}

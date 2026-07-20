import { C, DISPLAY, MONO, SANS } from "./theme";

// Global keyframes/classes used by the card-by-card ContentSection, QuizSection,
// and FinalTestSection renderers in SectionPlayers.tsx. Extracted from the old
// stacked-list module page so both the lesson and quiz routes can render it —
// each is now its own full page rather than a section inside one long list.
export function PlayerStyles() {
  return (
    <style>{`
      .tw-academy-player-spin{animation:tw-academy-player-sp 1s linear infinite;}
      @keyframes tw-academy-player-sp{to{transform:rotate(360deg);}}
      @keyframes tw-academy-player-fadein{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
      @keyframes tw-academy-player-pulse{0%,100%{box-shadow:0 0 0 0 ${C.amber}66;}50%{box-shadow:0 0 0 5px ${C.amber}00;}}
      .tw-academy-player-fadein{animation:tw-academy-player-fadein .4s ease both;}
      .tw-academy-player-pulse{animation:tw-academy-player-pulse 1.6s ease-in-out infinite;}
      @keyframes tw-academy-card-out{to{opacity:0;transform:translateY(-20px);}}
      .tw-academy-card-exit{animation:tw-academy-card-out .2s cubic-bezier(0.22,1,0.36,1) both;}
      @keyframes tw-academy-card-fadeup{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
      @keyframes tw-academy-card-scalein{from{opacity:0;transform:scale(.96);}to{opacity:1;transform:scale(1);}}
      @keyframes tw-academy-card-slideleft{from{opacity:0;transform:translateX(-30px);}to{opacity:1;transform:translateX(0);}}
      @keyframes tw-academy-card-fadein{from{opacity:0;}to{opacity:1;}}
      .tw-academy-card-anim-fadeup{animation:tw-academy-card-fadeup .4s cubic-bezier(0.22,1,0.36,1) both;}
      .tw-academy-card-anim-hero{animation:tw-academy-card-scalein .5s cubic-bezier(0.22,1,0.36,1) both;}
      .tw-academy-card-anim-keyinsight{animation:tw-academy-card-slideleft .4s cubic-bezier(0.22,1,0.36,1) both;}
      .tw-academy-card-anim-image{animation:tw-academy-card-fadein .3s cubic-bezier(0.22,1,0.36,1) both;}
      @keyframes tw-academy-hero-float{0%,100%{transform:translateY(0) rotate(-4deg);}50%{transform:translateY(-6px) rotate(4deg);}}
      .tw-academy-hero-icon{animation:tw-academy-hero-float 3.4s ease-in-out infinite;}
      .tw-academy-example-grid{display:grid;grid-template-columns:1fr 1fr;gap:28px;}
      .tw-academy-comparison-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
      @media(max-width:560px){
        .tw-academy-example-grid,.tw-academy-comparison-grid{grid-template-columns:1fr;}
      }
      @media(prefers-reduced-motion:reduce){
        .tw-academy-player-spin,.tw-academy-player-fadein,.tw-academy-player-pulse,.tw-academy-card-exit,
        .tw-academy-card-anim-fadeup,.tw-academy-card-anim-hero,.tw-academy-card-anim-keyinsight,
        .tw-academy-card-anim-image,.tw-academy-hero-icon{animation:none;}
      }
      .tw-academy-player-prose p{margin:0 0 14px;}
      .tw-academy-player-prose h1,.tw-academy-player-prose h2,.tw-academy-player-prose h3{
        font-family:${DISPLAY};color:${C.text};margin:22px 0 10px;
      }
      .tw-academy-player-prose ul,.tw-academy-player-prose ol{margin:0 0 14px;padding-left:22px;}
      .tw-academy-player-prose li{margin-bottom:6px;}
      .tw-academy-player-prose code{background:${C.line2};padding:2px 6px;border-radius:4px;font-family:${MONO};font-size:0.9em;}
      .tw-academy-player-prose pre{background:${C.panel};border:1px solid ${C.line};border-radius:8px;padding:12px 14px;overflow-x:auto;}
      .tw-academy-player-prose strong{color:${C.text};}
      .tw-academy-player-prose a{color:${C.amber};}
      .tw-academy-card-prose{font:400 16px/1.7 ${SANS};color:${C.cardBody};}
      .tw-academy-card-prose p{margin:0 0 16px;}
      .tw-academy-card-prose p:last-child{margin-bottom:0;}
      .tw-academy-card-prose h1,.tw-academy-card-prose h2,.tw-academy-card-prose h3{
        font:700 22px/1.3 ${DISPLAY};color:${C.text};margin:0 0 14px;
      }
      .tw-academy-card-prose ul,.tw-academy-card-prose ol{
        margin:0 0 16px;padding-left:16px;border-left:3px solid ${C.amber};
      }
      .tw-academy-card-prose li{margin-bottom:8px;padding-left:8px;}
      .tw-academy-card-prose code{
        font-family:${MONO};background:${C.codeBg};color:${C.amber};padding:2px 6px;border-radius:4px;font-size:0.9em;
      }
      .tw-academy-card-prose pre{
        font-family:${MONO};background:${C.codeBg};color:${C.amber};padding:12px;border-radius:8px;overflow-x:auto;
      }
      .tw-academy-card-prose pre code{background:transparent;padding:0;}
      .tw-academy-card-prose strong{color:${C.text};}
      .tw-academy-card-prose a{color:${C.amber};}
    `}</style>
  );
}

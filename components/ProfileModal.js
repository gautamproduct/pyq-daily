import { useState } from "react";
import { CLASSES, EXAMS } from "../lib/campaign";

export default function ProfileModal({ profile, onClose, onSave, saving, error }) {
  const [name, setName] = useState(profile?.name || "");
  const [klass, setKlass] = useState(profile?.class || null);
  const [exam, setExam] = useState(profile?.exam || null);

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !klass || !exam) return;
    onSave({ name: name.trim(), class: klass, exam });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative glass rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-card animate-pop"
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-xl font-bold">Edit profile</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none">
            ✕
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-6">Changing class/exam switches which leaderboard and questions you see.</p>

        {error && <p className="text-sm text-bad bg-bad/10 border border-bad/25 rounded-lg px-3 py-2 mb-4">{error}</p>}

        <label className="block text-xs font-semibold text-gold uppercase tracking-wide mb-2">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          className="w-full bg-panel2 border border-white/10 rounded-xl px-4 py-3 mb-5 outline-none focus:border-accent text-base"
        />

        <label className="block text-xs font-semibold text-gold uppercase tracking-wide mb-2">Class</label>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {CLASSES.map((c) => (
            <Chip key={c.value} label={c.label} selected={klass === c.value} onClick={() => setKlass(c.value)} accent="accent" />
          ))}
        </div>

        <label className="block text-xs font-semibold text-gold uppercase tracking-wide mb-2">Exam</label>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {EXAMS.map((ex) => (
            <Chip key={ex.value} label={ex.label} selected={exam === ex.value} onClick={() => setExam(ex.value)} accent="gold" />
          ))}
        </div>

        <button
          type="submit"
          disabled={saving || !name.trim() || !klass || !exam}
          className="btn-primary w-full text-white active:scale-[0.98] disabled:opacity-40 transition rounded-xl py-3.5 font-display font-bold"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}

function Chip({ label, selected, onClick, accent }) {
  const selectedCls =
    accent === "gold"
      ? "border-gold bg-gradient-to-r from-gold/20 to-transparent shadow-goldglow text-white"
      : "border-accent bg-gradient-to-r from-accent/25 to-transparent shadow-glow text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-center py-2.5 px-1 rounded-lg border transition active:scale-[0.97] text-sm font-medium ${
        selected ? selectedCls : "border-white/10 bg-panel2/60 hover:border-white/25 hover:bg-panel2"
      }`}
    >
      {label}
    </button>
  );
}

import { useState } from "react";

export default function Tabs({ tabs, defaultTab, onChange }) {
  const [active, setActive] = useState(defaultTab || tabs[0].key);
  const activeTab = tabs.find((t) => t.key === active) || tabs[0];

  function select(key) {
    setActive(key);
    if (onChange) onChange(key);
  }

  return (
    <div>
      <div className="flex gap-1 glass rounded-xl p-1 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => select(t.key)}
            className={`flex-1 text-sm font-medium rounded-lg py-2.5 transition ${
              active === t.key ? "btn-primary text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="animate-fade-up">{activeTab.content}</div>
    </div>
  );
}

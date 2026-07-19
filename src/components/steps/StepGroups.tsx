"use client";

import { useState } from "react";

import { useGroupsStore } from "@/store/groupsStore";

export function StepGroups() {
  const groups = useGroupsStore((s) => s.groups);
  const addGroup = useGroupsStore((s) => s.addGroup);
  const removeGroup = useGroupsStore((s) => s.removeGroup);
  const renameGroup = useGroupsStore((s) => s.renameGroup);
  const toggleRequired = useGroupsStore((s) => s.toggleRequired);
  const [newName, setNewName] = useState("");

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    addGroup(name);
    setNewName("");
  }

  return (
    <div className="space-y-4">
      <p className="text-text-secondary">
        예: &ldquo;전공 필수&rdquo;, &ldquo;교양 후보&rdquo;처럼 그룹을 만들고, 각 그룹에서 한 과목을 꼭 골라야
        하는지(필수) 아니면 안 골라도 되는지(선택)를 정하세요.
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="그룹 이름"
          className="flex-1 rounded-lg border border-neutral px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-button transition-all duration-150 hover:bg-primary-hover active:scale-95 active:bg-primary-active active:shadow-none"
        >
          추가
        </button>
      </div>

      <ul className="space-y-2">
        {groups.map((group) => (
          <li
            key={group.id}
            className="flex items-center justify-between rounded-xl bg-surface p-3 shadow-card transition-shadow hover:shadow-card-hover"
          >
            <div>
              <input
                type="text"
                value={group.name}
                onChange={(e) => renameGroup(group.id, e.target.value)}
                className="rounded border border-transparent bg-transparent font-medium outline-none transition-colors hover:border-neutral focus:border-primary"
              />
              <p className="text-xs text-text-secondary">{group.courseIds.length}개 과목 담김</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleRequired(group.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150 active:scale-95 ${
                  group.required ? "bg-primary text-white" : "bg-neutral/30 text-text-secondary hover:bg-neutral/50"
                }`}
              >
                {group.required ? "필수" : "선택"}
              </button>
              <button
                type="button"
                onClick={() => removeGroup(group.id)}
                aria-label={`${group.name} 그룹 삭제`}
                className="rounded-md px-1 text-text-secondary transition-all duration-150 hover:text-error active:scale-95"
              >
                삭제
              </button>
            </div>
          </li>
        ))}
        {groups.length === 0 && <p className="text-sm text-text-secondary">아직 만든 그룹이 없습니다.</p>}
      </ul>
    </div>
  );
}

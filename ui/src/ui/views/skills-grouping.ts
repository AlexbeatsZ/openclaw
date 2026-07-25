// Control UI view renders skills grouping screen content.
import { t } from "../../i18n/index.ts";
import type { SkillStatusEntry } from "../types.ts";

export type SkillGroup = {
  id: string;
  label: string;
  skills: SkillStatusEntry[];
};

const SKILL_SOURCE_GROUPS: Array<{ id: string; label: string; sources: string[] }> = [
  {
    id: "workspace",
    get label() {
      return t("rawUi.skills_grouping_prop_69681d79441a");
    },
    sources: ["openclaw-workspace"],
  },
  {
    id: "built-in",
    get label() {
      return t("rawUi.skills_grouping_prop_cad212d35d88");
    },
    sources: ["openclaw-bundled"],
  },
  {
    id: "installed",
    get label() {
      return t("rawUi.skills_grouping_prop_47ddecde909e");
    },
    sources: ["openclaw-managed"],
  },
  {
    id: "extra",
    get label() {
      return t("rawUi.skills_grouping_prop_700ccbe5810d");
    },
    sources: ["openclaw-extra"],
  },
];

export function groupSkills(skills: SkillStatusEntry[]): SkillGroup[] {
  const groups = new Map<string, SkillGroup>();
  for (const def of SKILL_SOURCE_GROUPS) {
    groups.set(def.id, { id: def.id, label: def.label, skills: [] });
  }
  const builtInGroup = SKILL_SOURCE_GROUPS.find((group) => group.id === "built-in");
  const other: SkillGroup = {
    id: "other",
    label: t("rawUi.skills_grouping_prop_4d4e83a5a3b6"),
    skills: [],
  };
  for (const skill of skills) {
    const match = skill.bundled
      ? builtInGroup
      : SKILL_SOURCE_GROUPS.find((group) => group.sources.includes(skill.source));
    if (match) {
      groups.get(match.id)?.skills.push(skill);
    } else {
      other.skills.push(skill);
    }
  }
  const ordered = SKILL_SOURCE_GROUPS.map((group) => groups.get(group.id)).filter(
    (group): group is SkillGroup => Boolean(group && group.skills.length > 0),
  );
  if (other.skills.length > 0) {
    ordered.push(other);
  }
  return ordered;
}

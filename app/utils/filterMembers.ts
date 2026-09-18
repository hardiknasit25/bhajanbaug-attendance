import type { MemberData } from "~/types/members.interface";

/**
 * Per-member lowercased search haystack, cached against the member object.
 *
 * A WeakMap keyed on the member object means the strings survive across
 * keystrokes (the member objects don't change while typing) and are collected
 * automatically when the list is replaced. The previous implementation rebuilt a
 * lowercased *copy of every member object* on every keystroke, which is what made
 * search feel laggy on lists of a few hundred members.
 */
const haystackCache = new WeakMap<MemberData, string>();

function haystackFor(member: MemberData): string {
  const cached = haystackCache.get(member);
  if (cached !== undefined) return cached;

  const haystack = [
    member.first_name,
    member.middle_name,
    member.last_name,
    member.smk_no,
    member.id,
  ]
    .filter((part) => part !== null && part !== undefined && part !== "")
    .join(" ")
    .toLowerCase();

  haystackCache.set(member, haystack);
  return haystack;
}

export function filterMembers<T extends MemberData>(
  memberList: T[],
  searchText: string,
): T[] {
  const query = searchText?.trim().toLowerCase();
  // No query: hand back the same array so callers keep referential equality and
  // don't re-render.
  if (!query) return memberList;

  const words = query.split(/\s+/).filter(Boolean);
  if (words.length === 0) return memberList;

  return memberList.filter((member) => {
    const haystack = haystackFor(member);
    for (let i = 0; i < words.length; i++) {
      if (!haystack.includes(words[i])) return false;
    }
    return true;
  });
}

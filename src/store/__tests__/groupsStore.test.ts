import { beforeEach, describe, expect, it } from "vitest";

import { groupDisplayName, useGroupsStore } from "../groupsStore";

beforeEach(() => {
  useGroupsStore.setState({ groups: [], builtForSemesterCode: null, semesterMismatchDetected: false });
  window.localStorage.clear();
});

describe("useGroupsStore", () => {
  it("adds a new group as required by default with no courses", () => {
    useGroupsStore.getState().addGroup("전공 필수");

    const { groups } = useGroupsStore.getState();
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ name: "전공 필수", required: true, courseIds: [] });
    expect(groups[0].id).toBeTruthy();
  });

  it("stores an empty name when none is given -- naming is left to the UI placeholder", () => {
    useGroupsStore.getState().addGroup();

    expect(useGroupsStore.getState().groups[0].name).toBe("");
  });

  it("stores an empty name when given an empty/whitespace-only string", () => {
    useGroupsStore.getState().addGroup("   ");

    expect(useGroupsStore.getState().groups[0].name).toBe("");
  });

  it("assigns distinct ids to different groups", () => {
    useGroupsStore.getState().addGroup("A");
    useGroupsStore.getState().addGroup("B");

    const { groups } = useGroupsStore.getState();
    expect(groups[0].id).not.toBe(groups[1].id);
  });

  it("removes a group by id", () => {
    useGroupsStore.getState().addGroup("A");
    const idToRemove = useGroupsStore.getState().groups[0].id;
    useGroupsStore.getState().addGroup("B");

    useGroupsStore.getState().removeGroup(idToRemove);

    const { groups } = useGroupsStore.getState();
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe("B");
  });

  it("renames a group", () => {
    useGroupsStore.getState().addGroup("초기이름");
    const id = useGroupsStore.getState().groups[0].id;

    useGroupsStore.getState().renameGroup(id, "바뀐이름");

    expect(useGroupsStore.getState().groups[0].name).toBe("바뀐이름");
  });

  it("toggles required on and back off", () => {
    useGroupsStore.getState().addGroup("A");
    const id = useGroupsStore.getState().groups[0].id;

    useGroupsStore.getState().toggleRequired(id);
    expect(useGroupsStore.getState().groups[0].required).toBe(false);

    useGroupsStore.getState().toggleRequired(id);
    expect(useGroupsStore.getState().groups[0].required).toBe(true);
  });

  it("adds a course to a group without duplicating it", () => {
    useGroupsStore.getState().addGroup("A");
    const id = useGroupsStore.getState().groups[0].id;

    useGroupsStore.getState().addCourseToGroup(id, 101);
    useGroupsStore.getState().addCourseToGroup(id, 101); // duplicate, should be a no-op
    useGroupsStore.getState().addCourseToGroup(id, 202);

    expect(useGroupsStore.getState().groups[0].courseIds).toEqual([101, 202]);
  });

  it("removes a course from a group", () => {
    useGroupsStore.getState().addGroup("A");
    const id = useGroupsStore.getState().groups[0].id;
    useGroupsStore.getState().addCourseToGroup(id, 101);
    useGroupsStore.getState().addCourseToGroup(id, 202);

    useGroupsStore.getState().removeCourseFromGroup(id, 101);

    expect(useGroupsStore.getState().groups[0].courseIds).toEqual([202]);
  });

  it("adding/removing a course to one group never affects another group", () => {
    useGroupsStore.getState().addGroup("A");
    useGroupsStore.getState().addGroup("B");
    const [idA, idB] = useGroupsStore.getState().groups.map((g) => g.id);

    useGroupsStore.getState().addCourseToGroup(idA, 101);

    expect(useGroupsStore.getState().groups.find((g) => g.id === idB)?.courseIds).toEqual([]);
  });

  it("moveCourseBetweenGroups moves a course from one group to another", () => {
    useGroupsStore.getState().addGroup("A");
    useGroupsStore.getState().addGroup("B");
    const [idA, idB] = useGroupsStore.getState().groups.map((g) => g.id);
    useGroupsStore.getState().addCourseToGroup(idA, 101);

    useGroupsStore.getState().moveCourseBetweenGroups(idA, idB, 101);

    const { groups } = useGroupsStore.getState();
    expect(groups.find((g) => g.id === idA)?.courseIds).toEqual([]);
    expect(groups.find((g) => g.id === idB)?.courseIds).toEqual([101]);
  });

  it("moveCourseBetweenGroups is a no-op when the course already exists in the target group", () => {
    useGroupsStore.getState().addGroup("A");
    useGroupsStore.getState().addGroup("B");
    const [idA, idB] = useGroupsStore.getState().groups.map((g) => g.id);
    useGroupsStore.getState().addCourseToGroup(idA, 101);
    useGroupsStore.getState().addCourseToGroup(idB, 101);

    useGroupsStore.getState().moveCourseBetweenGroups(idA, idB, 101);

    const { groups } = useGroupsStore.getState();
    expect(groups.find((g) => g.id === idA)?.courseIds).toEqual([]);
    expect(groups.find((g) => g.id === idB)?.courseIds).toEqual([101]);
  });

  it("stamps builtForSemesterCode when addCourseToGroup is given one", () => {
    useGroupsStore.getState().addGroup("A");
    const id = useGroupsStore.getState().groups[0].id;

    useGroupsStore.getState().addCourseToGroup(id, 101, "CM160.20");

    expect(useGroupsStore.getState().builtForSemesterCode).toBe("CM160.20");
  });

  it("leaves builtForSemesterCode unchanged when addCourseToGroup omits it", () => {
    useGroupsStore.getState().addGroup("A");
    const id = useGroupsStore.getState().groups[0].id;

    useGroupsStore.getState().addCourseToGroup(id, 101);

    expect(useGroupsStore.getState().builtForSemesterCode).toBeNull();
  });

  it("resetGroups clears both groups and builtForSemesterCode", () => {
    useGroupsStore.getState().addGroup("A");
    const id = useGroupsStore.getState().groups[0].id;
    useGroupsStore.getState().addCourseToGroup(id, 101, "CM160.20");

    useGroupsStore.getState().resetGroups();

    expect(useGroupsStore.getState().groups).toEqual([]);
    expect(useGroupsStore.getState().builtForSemesterCode).toBeNull();
  });

  it("resetGroupsForSemesterMismatch clears groups/builtForSemesterCode and flags semesterMismatchDetected", () => {
    useGroupsStore.getState().addGroup("A");
    const id = useGroupsStore.getState().groups[0].id;
    useGroupsStore.getState().addCourseToGroup(id, 101, "CM160.20");

    useGroupsStore.getState().resetGroupsForSemesterMismatch();

    expect(useGroupsStore.getState().groups).toEqual([]);
    expect(useGroupsStore.getState().builtForSemesterCode).toBeNull();
    expect(useGroupsStore.getState().semesterMismatchDetected).toBe(true);
  });
});

describe("groupDisplayName", () => {
  it("returns the trimmed name when one is set", () => {
    const group = { id: "g1", name: "전공 필수", required: true, courseIds: [] };
    expect(groupDisplayName(group, 0)).toBe("전공 필수");
  });

  it("falls back to '그룹 N' (1-indexed) when the name is empty", () => {
    const group = { id: "g1", name: "", required: true, courseIds: [] };
    expect(groupDisplayName(group, 0)).toBe("그룹 1");
    expect(groupDisplayName(group, 3)).toBe("그룹 4");
  });

  it("falls back when the name is whitespace-only", () => {
    const group = { id: "g1", name: "   ", required: true, courseIds: [] };
    expect(groupDisplayName(group, 1)).toBe("그룹 2");
  });
});

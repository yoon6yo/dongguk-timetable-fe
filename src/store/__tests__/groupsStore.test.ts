import { beforeEach, describe, expect, it } from "vitest";

import { useGroupsStore } from "../groupsStore";

beforeEach(() => {
  useGroupsStore.setState({ groups: [] });
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
});

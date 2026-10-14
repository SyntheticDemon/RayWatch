import { describe, expect, it } from "vitest";

import { jobDetailBreadcrumbs } from "@/shared/ui/breadcrumb-trail";

describe("jobDetailBreadcrumbs", () => {
  it("builds jobs → job → task trail", () => {
    const items = jobDetailBreadcrumbs({
      jobId: "j1",
      entrypoint: "python train.py",
      taskId: "t9",
      taskLabel: "train_step",
    });
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ label: "Jobs", to: "/" });
    expect(items[1]).toMatchObject({ to: "/jobs/j1" });
    expect(items[2]).toMatchObject({ label: "train_step" });
  });

  it("uses entrypoint for job crumb when present", () => {
    const items = jobDetailBreadcrumbs({ jobId: "j1", entrypoint: "my_app.py" });
    expect(items[1]).toMatchObject({ label: "my_app.py", current: true });
  });
});

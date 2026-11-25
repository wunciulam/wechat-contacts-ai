async (page) => {
  page.setDefaultTimeout(6000);
  await page.clock.setFixedTime(new Date("2026-11-23T04:00:00Z"));
  await page.unrouteAll({ behavior: "wait" });
  const policies = [
    "正式保单",
    "终止保单",
    "撤单",
    "终止保单-满期终止",
    "撤单中",
    "中止保单",
  ].map((status, i) => ({
    id: "p" + i,
    policyNumber: "P7X26310921000000004682-" + i,
    productName: "测试长名称医疗保险（互联网版）与重大疾病保障计划",
    company: "示例公司",
    premium: "8235",
    effectiveDate: "2023-05-18",
    status,
    applicant: "示例客户",
    insured: "示例客户、其他被保人",
    paymentFrequency: "期交-年",
    paymentYears: "30年",
    payments: [],
    applicantId: "c1",
    insuredId: "c1",
    mingya: {
      mappingVersion: 2,
      key: "test" + i,
      capturedAt: "2026-11-21T01:00:00Z",
      nextPayDate: "2027-05-18",
      nextPremium: "8235",
      nextPremiumIsReference: true,
      currency: "CNY",
    },
  }));
  const c = {
    id: "c1",
    remarkName: "示例客户",
    nickname: "示例客户",
    wxid: "",
    remarkInfo: "保留备注",
    tags: ["成交客户"],
    addedAt: 1,
    dealProducts: [],
    intentProducts: [],
    policies,
    followUpStatus: "following",
    progressHistory: [
      { id: "r0", date: "2026-11-20", content: "原有记录", completed: false },
    ],
  };
  const other = {
    ...c,
    progressHistory: structuredClone(c.progressHistory),
    id: "c2",
    remarkName: "其他客户",
    nickname: "其他客户",
    policies: [
      {
        ...policies[0],
        id: "other",
        applicantId: "c2",
        insuredId: "c2",
        policyNumber: "OTHER",
        mingya: { ...policies[0].mingya, key: "other" },
      },
    ],
  };
  const closed = {
    ...c,
    progressHistory: structuredClone(c.progressHistory),
    id: "c3",
    remarkName: "仅终止客户",
    nickname: "仅终止客户",
    policies: [
      {
        ...policies[1],
        id: "closed",
        applicantId: "c3",
        insuredId: "c3",
        policyNumber: "CLOSED",
        mingya: { ...policies[1].mingya, key: "closed" },
      },
    ],
  };
  const s = {
    contacts: [c, other, closed],
    renewal: {
      policies: [...policies, ...other.policies, ...closed.policies],
      settings: { email: "", time: "09:00", enabled: false },
      imports: [],
    },
    fail: false,
    profileFail: false,
    delay: 600,
    requests: [],
  };
  page._follow = s;
  await page.route("**/api/followup-ai", r => r.fulfill({json:{configured:false}}));
  await page.route("**/api/renewal-email", (r) =>
    r.fulfill({ json: { configured: false } }),
  );
  await page.route(/https:\/\/.*\.supabase\.co\/rest\/v1\//, async (route) => {
    const req = route.request(),
      u = new URL(req.url()),
      type = u.searchParams.get("data_type") || "";
    const row = (data_type, data) => ({
      id: "test",
      app_id: "app_yp9dq7mofjm",
      data_type,
      data,
      updated_at: "2026-11-22T01:00:00Z",
    });
    if (req.method() === "GET")
      return route.fulfill({
        json: type.startsWith("in.")
          ? [row("contacts", s.contacts), row("renewal_v1", s.renewal)]
          : type === "eq.contacts"
            ? row("contacts", s.contacts)
            : type === "eq.renewal_v1"
              ? row("renewal_v1", s.renewal)
              : row("categories", []),
      });
    s.requests.push({
      path: u.pathname,
      bytes: Buffer.byteLength(req.postData() || ""),
    });
    const b = req.postDataJSON();
    if (u.pathname.endsWith("/rpc/delete_selected_policies_v1")) {
      await new Promise((r) => setTimeout(r, 500));
      s.deletes ||= [];
      s.deletes.push(b);
      if (s.fail)
        return route.fulfill({
          status: 500,
          json: { message: "测试删除失败，请重试。" },
        });
      const ids = b.p_policy_ids;
      s.renewal.policies = s.renewal.policies.filter(
        (p) => !ids.includes(p.id),
      );
      s.contacts = s.contacts.map((c) => ({
        ...c,
        policies: c.policies.filter((p) => !ids.includes(p.id)),
      }));
      return route.fulfill({ json: { deletedIds: ids } });
    }
    if(u.pathname.endsWith("/rpc/save_followup_bundle_v1")) {
      await new Promise(r=>setTimeout(r,s.delay));
      if(s.fail)return route.fulfill({status:500,json:{message:"测试保存失败，输入已保留"}});
      const c=s.contacts.find(c=>c.id===b.p_contact_id);
      for(const {record} of b.p_bundle.writes){const index=c.progressHistory.findIndex(r=>r.id===record.id);const saved={...record,updatedAt:"2026-11-23T04:00:00.000Z"};if(index<0)c.progressHistory.unshift(saved);else c.progressHistory[index]=saved;}
      if(b.p_bundle.analysis)c.followupAnalysis=b.p_bundle.analysis;
      if(b.p_bundle.snoozedUntil!==undefined)c.followupSnoozedUntil=b.p_bundle.snoozedUntil;
      return route.fulfill({json:c});
    }
    if (u.pathname.endsWith("/rpc/save_followup_v1")) {
      await new Promise((r) => setTimeout(r, s.delay));
      if (s.fail)
        return route.fulfill({
          status: 500,
          json: { message: "测试保存失败，输入已保留" },
        });
      let c = s.contacts.find((c) => c.id === b.p_contact_id);
      if (!c) {
        c = { ...b.p_new_contact, progressHistory: [] };
        s.contacts.push(c);
      }
      const record = { ...b.p_record, updatedAt: "2026-11-22T04:00:00.000Z" };
      if (b.p_kind === "delete")
        c.progressHistory = c.progressHistory.filter((r) => r.id !== record.id);
      else if (b.p_kind === "edit")
        c.progressHistory = c.progressHistory.map((r) =>
          r.id === record.id ? record : r,
        );
      else if (!c.progressHistory.some((r) => r.id === record.id))
        c.progressHistory.unshift(record);
      c.lastDate = record.date;
      c.followUpStatus = "following";
      return route.fulfill({ json: c });
    }
    if (u.pathname.endsWith("/rpc/save_customer_profile_v1")) {
      if (s.profileFail)
        return route.fulfill({
          status: 409,
          json: { message: "客户资料已在另一页面修改，请刷新后重试" },
        });
      let index = s.contacts.findIndex((c) => c.id === b.p_contact.id);
      const before = s.contacts[index];
      const c = before
        ? { ...b.p_contact, progressHistory: before.progressHistory }
        : b.p_contact;
      if (index < 0) s.contacts.push(c);
      else s.contacts[index] = c;
      return route.fulfill({ json: c });
    }
    if (req.method() === "PATCH" && type === "eq.contacts") s.contacts = b.data;
    if (req.method() === "POST" && Array.isArray(b))
      return route.fulfill({
        json: b
          .filter((x) => ["contacts", "renewal_v1"].includes(x.data_type))
          .map((x) => ({ data_type: x.data_type, data: x.data })),
      });
    return route.fulfill({ json: [] });
  });
  await page.setViewportSize({ width: 1304, height: 880 });
  await page.goto("__BASE_URL__/");
  await page.getByRole("heading", { name: "示例客户", exact: true }).click();
  await page.getByRole("dialog", {name:"示例客户的客户详情",exact:true}).getByRole("button", {name:"编辑资料",exact:true}).click();
  return { loaded: true };
};

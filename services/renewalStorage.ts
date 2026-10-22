import { supabase } from "./supabaseService";
import type { RenewalData } from "./renewal";
import type { Contact } from "../types";
const appId = import.meta.env.VITE_APP_ID;
// One PostgREST insert statement commits both rows together; rejected on any constraint failure.
export async function saveImport(data: RenewalData, contacts: Contact[]) {
  if (!appId) throw new Error("缺少固定数据标识，已阻止导入");
  const { error } = await supabase.from("app_data").upsert(
    [
      {
        app_id: appId,
        data_type: "renewal_v1",
        data,
        updated_at: new Date().toISOString(),
      },
      {
        app_id: appId,
        data_type: "contacts",
        data: contacts,
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: "app_id,data_type" },
  );
  if (error) throw error;
}

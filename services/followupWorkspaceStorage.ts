import { supabase } from "./supabaseService";
import type { Contact } from "../types";
import type { FollowupBundle } from "./followupMutation";
export async function saveFollowupBundle(
  contactId: string,
  bundle: FollowupBundle,
): Promise<Contact> {
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const { data, error } = await supabase
      .rpc("save_followup_bundle_v1", {
        p_app_id: import.meta.env.VITE_APP_ID,
        p_contact_id: contactId,
        p_bundle: bundle,
      })
      .abortSignal(controller.signal);
    if (error) throw Error(error.message || "跟进未保存，请重试。");
    if (!data?.id) throw Error("未收到保存确认，草稿已保留。");
    return data;
  } catch (e) {
    if (controller.signal.aborted)
      throw Error("保存超时，请核对后重试，输入已保留。");
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

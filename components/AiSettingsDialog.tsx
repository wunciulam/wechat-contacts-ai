import {notify} from '../services/notifications';
import React, { useEffect, useRef, useState } from "react";
import WorkspaceDialog, { WorkspaceDialogFooter } from "./WorkspaceDialog";
import Button from "./ui/Button";
import Input from "./ui/Input";
import Select from "./ui/Select";
import Field from "./ui/Field";
type Status = { configured: boolean; model: string; editable: boolean };
export async function aiSettingsRequest(body?: object): Promise<any> {
  const response = await fetch("/api/ai-settings", {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(25000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data)
    throw Error(data?.message || "AI 设置暂不可用，请重试。");
  return data;
}
export default function AiSettingsDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<Status | null>(null),
    [apiKey, setApiKey] = useState(""),
    [model, setModel] = useState("deepseek-flash"),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [tested, setTested] = useState(false),
    [saved, setSaved] = useState(false);
  const running = useRef(false);
  useEffect(() => {
    let cancelled = false;
    aiSettingsRequest()
      .then((data) => {
        if (!cancelled) {
          setStatus(data);
          setModel(data.model);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const changed = Boolean(apiKey || (status && model !== status.model));
  function close() {
    if (running.current) return;
    if (changed && !saved && !window.confirm("AI 配置尚未保存，确认放弃修改？"))
      return;
    onClose();
  }
  async function submit(action: "test" | "save") {
    if (running.current) return;
    running.current = true;
    setBusy(action);
    setError("");
    try {
      const data = await aiSettingsRequest({ action, apiKey, model });
      if (action === "test") {
        setTested(true);notify("连接成功，可以生成梗概和客户分析。",{id:"ai-config"});
      } else {
        setStatus(data);
        setApiKey("");
        setSaved(true);notify("已保存并启用",{id:"ai-config"});
        setTested(false);
        onSaved();
      }
    } catch (e) {
      if (action === "test") setTested(false);
      setError(e instanceof Error ? e.message : "连接失败，请重试。");
    } finally {
      running.current = false;
      setBusy("");
    }
  }
  return (
    <WorkspaceDialog
      title="AI 设置"
      compact
      onClose={close}
      closeDisabled={Boolean(busy)}
    >
      <div className="space-y-5">
        {!status && !error && (
          <p role="status" className="text-sm text-gray-500">
            正在读取配置…
          </p>
        )}
        {status && (
          <>
            <div className="flex justify-between items-center text-sm">
              <strong>DeepSeek</strong>
              <span className="text-gray-500">
                {status.configured ? "已配置" : "未配置"}
              </span>
            </div>
            {status.editable ? (
              <>
                <Field label="API Key">
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={apiKey}
                    disabled={Boolean(busy)}
                    placeholder={
                      status.configured
                        ? "留空沿用已保存密钥"
                        : "填写 DeepSeek API Key"
                    }
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setTested(false);
                      setSaved(false);
                    }}
                  />
                </Field>
                <Field label="模型">
                  <Select
                    value={model}
                    disabled={Boolean(busy)}
                    onValueChange={(v) => {
                      setModel(v);
                      setTested(false);
                      setSaved(false);
                    }}
                  >
                    <option value="deepseek-flash">DeepSeek Flash</option>
                    <option value="deepseek-v4-pro">DeepSeek Pro</option>
                  </Select>
                </Field>
                <p className="text-xs text-gray-500">
                  密钥仅保存在本机服务端。生成梗概和分析时，所选沟通内容会发送给
                  DeepSeek。
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-600">
                此部署的密钥由服务端管理员配置。
              </p>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger-600">
            {error}
          </p>
        )}
      </div>
      <WorkspaceDialogFooter>
        {!status && error && (
          <Button
            onClick={() => {
              setError("");
              aiSettingsRequest()
                .then((data) => {
                  setStatus(data);
                  setModel(data.model);
                })
                .catch((e) => setError(e.message));
            }}
          >
            重新读取
          </Button>
        )}
        {status?.editable ? (
          <>
            <Button
              disabled={Boolean(busy) || (!apiKey && !status.configured)}
              onClick={() => submit("test")}
            >
              {busy === "test" ? "连接中…" : "测试连接"}
            </Button>
            <Button
              variant="primary"
              disabled={Boolean(busy) || !tested}
              onClick={() => submit("save")}
            >
              {busy === "save" ? "保存中…" : "保存并启用"}
            </Button>
          </>
        ) : (
          <Button onClick={close}>关闭</Button>
        )}
      </WorkspaceDialogFooter>
    </WorkspaceDialog>
  );
}

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/admin/field";
import {
  commitRepositoryAction,
  getRepositoryDiffAction,
  inspectRepositoryAction,
  pushRepositoryAction,
} from "@/lib/admin/actions/repository";

type HealthData = Awaited<ReturnType<typeof inspectRepositoryAction>>;

function StateLine({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="grid gap-1 border-b border-border py-2 sm:grid-cols-[12rem_8rem_1fr]">
      <span className="text-sm">{label}</span>
      <span className={ok ? "meta text-green-600" : "meta text-destructive"}>{ok ? "PASS" : "CHECK"}</span>
      {detail && <span className="break-all text-xs text-muted-foreground">{detail}</span>}
    </div>
  );
}

type TemplateStatus =
  | { ok: true; root: string; branch: string; remote: string; status: string; templateName: string; templateVersion: string; contractVersion: number }
  | { ok: false; error: string };

export function RepositoryPanel({ initial, template }: { initial: { root: string; remote: string; branch: string; status: string; diffStat: string; diffCheck: { ok: boolean; output: string }; instanceName: string; templateName: string; templateContractVersion: number }; template: TemplateStatus }) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [diff, setDiff] = useState<{ stat: string; patch: string } | null>(null);
  const [message, setMessage] = useState("content: update portfolio");
  const [busy, start] = useTransition();

  async function inspect() {
    start(async () => {
      const result = await inspectRepositoryAction();
      setHealth(result);
      if (!result.ok) toast.error(result.error);
    });
  }

  async function showDiff() {
    start(async () => {
      const result = await getRepositoryDiffAction();
      if (result.ok) setDiff(result.data);
      else toast.error(result.error);
    });
  }

  async function commit() {
    start(async () => {
      const result = await commitRepositoryAction(message);
      if (result.ok) {
        toast.success("Committed content and public assets.");
        setDiff(null);
      } else toast.error(result.error);
    });
  }

  async function push() {
    start(async () => {
      const result = await pushRepositoryAction();
      if (result.ok) toast.success("Pushed to origin.");
      else toast.error(result.error);
    });
  }

  const healthData = health?.ok ? health.data : null;
  return (
    <div className="grid gap-8">
      <section className="grid gap-3">
        <h2 className="meta">repository identity</h2>
        <div className="rounded-md border border-border p-4 text-sm">
          <p className="mb-2 font-medium">{initial.instanceName} <span className="meta ml-2">production</span></p>
          <p className="break-all font-mono">{initial.root}</p>
          <p className="mt-2 break-all text-xs text-muted-foreground">{initial.remote || "No origin remote"}</p>
          <p className="mt-1 text-xs text-muted-foreground">Branch: {initial.branch || "detached HEAD"}</p>
          <p className="mt-3 text-xs text-muted-foreground">This panel inspects the configured website repository, not the editor repository.</p>
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="meta">reusable template · read only</h2>
        {template.ok ? (
          <div className="rounded-md border border-border p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{template.templateName} <span className="meta ml-2">v{template.templateVersion}</span></p>
              <span className="meta rounded-full border border-border px-2 py-1">contract v{template.contractVersion}</span>
            </div>
            <StateLine
              label="Production compatibility"
              ok={initial.templateName === template.templateName && initial.templateContractVersion === template.contractVersion}
              detail={`Production expects ${initial.templateName} contract v${initial.templateContractVersion}; loaded ${template.templateName} contract v${template.contractVersion}.`}
            />
            <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{template.root}</p>
            <p className="mt-1 break-all text-xs text-muted-foreground">{template.remote || "No origin remote"} · branch {template.branch || "detached HEAD"}</p>
            <p className="mt-2 text-xs text-muted-foreground">Inspected only. Content saves, commits and pushes below target the production repository shown above.</p>
          </div>
        ) : (
          <p className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">Template unavailable: {template.error}. Check PORTFOLIO_TEMPLATE_PATH.</p>
        )}
      </section>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="meta">working tree</h2>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={showDiff}>Show diff</Button>
            <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={inspect}>Run health check</Button>
          </div>
        </div>
        <pre className="max-h-64 overflow-auto rounded-md border border-border p-3 font-mono text-xs">{initial.status || "Clean working tree"}</pre>
        <p className="text-xs text-muted-foreground">{initial.diffStat || "No unstaged diff."}</p>
      </section>

      {health && (
        <section className="grid gap-3">
          <h2 className="meta">repository doctor</h2>
          {!health.ok ? (
            <p className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{health.error}</p>
          ) : (
            <div className="rounded-md border border-border px-3">
              <StateLine label="Repository root" ok={healthData!.root === healthData!.expectedRoot} detail={healthData!.root} />
              <StateLine label="Expected remote" ok={healthData!.remoteMatches} detail={"Expected: " + healthData!.expectedRemote + " · Actual: " + healthData!.remote} />
              <StateLine label="Git object integrity" ok={healthData!.fsck.ok} detail={healthData!.fsck.output || "git fsck --full --strict returned no errors"} />
              <StateLine label="Content files" ok={healthData!.content.ok} detail={healthData!.content.output} />
              <StateLine label="Static build output" ok={healthData!.staticOutput.ok} detail={healthData!.staticOutput.output} />
              <StateLine label="Remote connectivity" ok={healthData!.remoteConnectivity.ok} detail={healthData!.remoteConnectivity.ok ? "origin is reachable" : healthData!.remoteConnectivity.output} />
              <StateLine label="Whitespace / patch" ok={healthData!.diffCheck.ok} detail={healthData!.diffCheck.output || "git diff --check passed"} />
              <StateLine label="Working tree" ok={!healthData!.status.split("\n").some((line) => line && !line.startsWith("##"))} detail={healthData!.status} />
            </div>
          )}
        </section>
      )}

      {diff && (
        <section className="grid gap-2">
          <h2 className="meta">git diff</h2>
          <pre className="max-h-[28rem] overflow-auto rounded-md border border-border p-3 font-mono text-xs">{diff.stat || "No diff"}</pre>
          <details className="rounded-md border border-border p-3">
            <summary className="cursor-pointer text-sm">View patch</summary>
            <pre className="mt-3 max-h-[36rem] overflow-auto whitespace-pre-wrap break-all font-mono text-xs">{diff.patch || "No patch"}</pre>
          </details>
        </section>
      )}

      <section className="grid gap-3 border-t border-border pt-6">
        <h2 className="meta">explicit publishing actions</h2>
        <Field label="Commit message" name="commit-message">
          <Input value={message} onChange={(event) => setMessage(event.target.value)} maxLength={160} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={busy || !initial.status.trim()} onClick={commit}>Commit content + assets</Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={push}>Push to origin</Button>
        </div>
        <p className="text-xs text-muted-foreground">Commit stages only content/ and public/assets/. Push transmits the existing commits on the current branch. Neither action runs automatically on Save.</p>
      </section>
    </div>
  );
}

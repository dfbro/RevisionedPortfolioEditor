"use server";

import { commitRepositoryChanges, pushRepositoryChanges, repositoryDiff, repositoryHealth, repositoryStatus } from "@/lib/editor-repository";

export async function inspectRepositoryAction() {
  try {
    return { ok: true as const, data: await repositoryHealth() };
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }
}

export async function getRepositoryDiffAction() {
  try {
    return { ok: true as const, data: await repositoryDiff() };
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }
}

export async function getRepositoryStatusAction() {
  try {
    return { ok: true as const, data: await repositoryStatus() };
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }
}

export async function commitRepositoryAction(subject: string) {
  try {
    return { ok: true as const, output: await commitRepositoryChanges(subject) };
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }
}

export async function pushRepositoryAction() {
  try {
    return { ok: true as const, output: await pushRepositoryChanges() };
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }
}

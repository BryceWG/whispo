import * as fs from "fs"
import { promises as fsPromises } from "fs"
import { getRendererHandlers, tipc } from "@egoist/tipc/main"
import { showPanelWindow, WINDOWS } from "./window"
import {
  app,
  clipboard,
  Menu,
  shell,
  systemPreferences,
  dialog,
} from "electron"
import { join } from "path"
import { configStore, recordingsFolder } from "./config"
import { Config, RecordingHistoryItem } from "../shared/types"
import { RendererHandlers } from "./renderer-handlers"
import { postProcessTranscript } from "./llm"
import { state } from "./state"
import { updateTrayIcon } from "./tray"
import { isAccessibilityGranted } from "./utils"
import { writeText } from "./keyboard"
import { execSync } from "child_process"
import { tmpdir } from "os"

const t = tipc.create()

const getRecordingHistory = () => {
  try {
    const history = JSON.parse(
      fs.readFileSync(join(recordingsFolder, "history.json"), "utf8"),
    ) as RecordingHistoryItem[]

    // sort desc by createdAt
    return history.sort((a, b) => b.createdAt - a.createdAt)
  } catch {
    return []
  }
}

const saveRecordingsHitory = (history: RecordingHistoryItem[]) => {
  fs.writeFileSync(
    join(recordingsFolder, "history.json"),
    JSON.stringify(history),
  )
}

// 获取 ffmpeg 路径
function getFfmpegPath() {
  const isDev = process.env.NODE_ENV === "development"
  if (isDev) {
    return "ffmpeg"
  }
  return join(process.resourcesPath, "ffmpeg", "ffmpeg.exe")
}

// 添加音频转换函数
async function convertWebmToWav(inputBuffer: ArrayBuffer): Promise<Buffer> {
  const tempDir = tmpdir();
  const tempInputPath = join(tempDir, `temp-${Date.now()}.webm`);
  const tempOutputPath = join(tempDir, `temp-${Date.now()}.wav`);
  const ffmpegPath = getFfmpegPath();

  try {
    // 写入临时 webm 文件
    fs.writeFileSync(tempInputPath, Buffer.from(inputBuffer));

    // 使用 ffmpeg 转换为 wav
    execSync(`"${ffmpegPath}" -i "${tempInputPath}" -acodec pcm_s16le -ar 16000 "${tempOutputPath}"`, {
      stdio: 'pipe'
    });

    // 读取转换后的 wav 文件
    const wavBuffer = fs.readFileSync(tempOutputPath);

    // 清理临时文件
    fs.unlinkSync(tempInputPath);
    fs.unlinkSync(tempOutputPath);

    return wavBuffer;
  } catch (error) {
    // 确保清理临时文件
    try {
      fs.unlinkSync(tempInputPath);
      fs.unlinkSync(tempOutputPath);
    } catch {}
    throw error;
  }
}

export const router = {
  restartApp: t.procedure.action(async () => {
    app.relaunch()
    app.quit()
  }),

  getUpdateInfo: t.procedure.action(async () => {
    const { getUpdateInfo } = await import("./updater")
    return getUpdateInfo()
  }),

  quitAndInstall: t.procedure.action(async () => {
    const { quitAndInstall } = await import("./updater")

    quitAndInstall()
  }),

  checkForUpdatesAndDownload: t.procedure.action(async () => {
    const { checkForUpdatesAndDownload } = await import("./updater")

    return checkForUpdatesAndDownload()
  }),

  openMicrophoneInSystemPreferences: t.procedure.action(async () => {
    await shell.openExternal(
      "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone",
    )
  }),

  hidePanelWindow: t.procedure.action(async () => {
    const panel = WINDOWS.get("panel")

    panel?.hide()
  }),

  showContextMenu: t.procedure
    .input<{ x: number; y: number; selectedText?: string }>()
    .action(async ({ input, context }) => {
      const items: Electron.MenuItemConstructorOptions[] = []

      if (input.selectedText) {
        items.push({
          label: "Copy",
          click() {
            clipboard.writeText(input.selectedText || "")
          },
        })
      }

      const isDev = process.env.NODE_ENV === "development"

      if (isDev) {
        items.push({
          label: "Inspect Element",
          click() {
            context.sender.inspectElement(input.x, input.y)
          },
        })
      }

      const panelWindow = WINDOWS.get("panel")
      const isPanelWindow = panelWindow?.webContents.id === context.sender.id

      if (isPanelWindow) {
        items.push({
          label: "Close",
          click() {
            panelWindow?.hide()
          },
        })
      }

      const menu = Menu.buildFromTemplate(items)
      menu.popup({
        x: input.x,
        y: input.y,
      })
    }),

  getMicrophoneStatus: t.procedure.action(async () => {
    return systemPreferences.getMediaAccessStatus("microphone")
  }),

  isAccessibilityGranted: t.procedure.action(async () => {
    return isAccessibilityGranted()
  }),

  requestAccesssbilityAccess: t.procedure.action(async () => {
    if (process.platform === "win32") return true

    return systemPreferences.isTrustedAccessibilityClient(true)
  }),

  requestMicrophoneAccess: t.procedure.action(async () => {
    return systemPreferences.askForMediaAccess("microphone")
  }),

  showPanelWindow: t.procedure.action(async () => {
    showPanelWindow()
  }),

  displayError: t.procedure
    .input<{ title?: string; message: string }>()
    .action(async ({ input }) => {
      dialog.showErrorBox(input.title || "Error", input.message)
    }),

  createRecording: t.procedure
    .input<{
      recording: ArrayBuffer
      duration: number
    }>()
    .action(async ({ input }) => {
      fs.mkdirSync(recordingsFolder, { recursive: true })

      const config = configStore.get()
      const form = new FormData()

      if (config.sttProviderId === "siliconflow") {
        // 转换音频格式
        const wavBuffer = await convertWebmToWav(input.recording);
        
        form.append(
          "file",
          new File([wavBuffer], "recording.wav", { type: "audio/wav" }),
        )
        form.append(
          "model",
          config.siliconflowModel || "FunAudioLLM/SenseVoiceSmall"
        )

        const siliconflowBaseUrl = config.siliconflowBaseUrl || "https://api.siliconflow.cn/v1"

        const transcriptResponse = await fetch(
          `${siliconflowBaseUrl}/audio/transcriptions`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${config.siliconflowApiKey}`,
            },
            body: form,
          }
        )

        if (!transcriptResponse.ok) {
          const message = `${transcriptResponse.statusText} ${(await transcriptResponse.text()).slice(0, 300)}`
          throw new Error(message)
        }

        const json: { text: string } = await transcriptResponse.json()
        const transcript = await postProcessTranscript(json.text)

        const history = getRecordingHistory()
        const item: RecordingHistoryItem = {
          id: Date.now().toString(),
          createdAt: Date.now(),
          duration: input.duration,
          transcript,
        }
        history.push(item)
        saveRecordingsHitory(history)

        fs.writeFileSync(
          join(recordingsFolder, `${item.id}.wav`),
          wavBuffer,
        )

        const main = WINDOWS.get("main")
        if (main) {
          getRendererHandlers<RendererHandlers>(
            main.webContents,
          ).refreshRecordingHistory.send()
        }

        const panel = WINDOWS.get("panel")
        if (panel) {
          panel.hide()
        }

        // paste
        clipboard.writeText(transcript)
        if (isAccessibilityGranted()) {
          await writeText(transcript)
        }

        return
      }

      form.append(
        "model",
        config.sttProviderId === "groq" ? "whisper-large-v3" : "whisper-1",
      )
      form.append("response_format", "json")

      const groqBaseUrl = config.groqBaseUrl || "https://api.groq.com/openai/v1"
      const openaiBaseUrl = config.openaiBaseUrl || "https://api.openai.com/v1"

      const transcriptResponse = await fetch(
        config.sttProviderId === "groq"
          ? `${groqBaseUrl}/audio/transcriptions`
          : `${openaiBaseUrl}/audio/transcriptions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.sttProviderId === "groq" ? config.groqApiKey : config.openaiApiKey}`,
          },
          body: form,
        },
      )

      if (!transcriptResponse.ok) {
        const message = `${transcriptResponse.statusText} ${(await transcriptResponse.text()).slice(0, 300)}`

        throw new Error(message)
      }

      const json: { text: string } = await transcriptResponse.json()
      const transcript = await postProcessTranscript(json.text)

      const history = getRecordingHistory()
      const item: RecordingHistoryItem = {
        id: Date.now().toString(),
        createdAt: Date.now(),
        duration: input.duration,
        transcript,
      }
      history.push(item)
      saveRecordingsHitory(history)

      fs.writeFileSync(
        join(recordingsFolder, `${item.id}.webm`),
        Buffer.from(input.recording),
      )

      const main = WINDOWS.get("main")
      if (main) {
        getRendererHandlers<RendererHandlers>(
          main.webContents,
        ).refreshRecordingHistory.send()
      }

      const panel = WINDOWS.get("panel")
      if (panel) {
        panel.hide()
      }

      // paste
      clipboard.writeText(transcript)
      if (isAccessibilityGranted()) {
        await writeText(transcript)
      }
    }),

  getRecordingHistory: t.procedure.action(async () => getRecordingHistory()),

  deleteRecordingItem: t.procedure
    .input<{ id: string }>()
    .action(async ({ input }) => {
      const recordings = getRecordingHistory().filter(
        (item) => item.id !== input.id,
      )
      saveRecordingsHitory(recordings)
      fs.unlinkSync(join(recordingsFolder, `${input.id}.webm`))
    }),

  deleteRecordingHistory: t.procedure.action(async () => {
    fs.rmSync(recordingsFolder, { force: true, recursive: true })
  }),

  getConfig: t.procedure.action(async () => {
    return configStore.get()
  }),

  saveConfig: t.procedure
    .input<{ config: Config }>()
    .action(async ({ input }) => {
      configStore.save(input.config)
    }),

  recordEvent: t.procedure
    .input<{ type: "start" | "end" }>()
    .action(async ({ input }) => {
      if (input.type === "start") {
        state.isRecording = true
      } else {
        state.isRecording = false
      }
      updateTrayIcon()
    }),
}

export type Router = typeof router

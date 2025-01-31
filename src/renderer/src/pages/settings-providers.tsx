import { Control, ControlGroup } from "@renderer/components/ui/control"
import { Input } from "@renderer/components/ui/input"
import {
  useConfigQuery,
  useSaveConfigMutation,
} from "@renderer/lib/query-client"
import { Config } from "@shared/types"
import { Switch } from "@renderer/components/ui/switch"

export function Component() {
  const configQuery = useConfigQuery()

  const saveConfigMutation = useSaveConfigMutation()

  const saveConfig = (config: Partial<Config>) => {
    saveConfigMutation.mutate({
      config: {
        ...configQuery.data,
        ...config,
      },
    })
  }

  if (!configQuery.data) return null

  return (
    <div className="grid gap-4">
      <ControlGroup title="OpenAI">
        <Control label="API Key" className="px-3">
          <Input
            type="password"
            defaultValue={configQuery.data.openaiApiKey}
            onChange={(e) => {
              saveConfig({
                openaiApiKey: e.currentTarget.value,
              })
            }}
          />
        </Control>

        <Control label="API Base URL" className="px-3">
          <Input
            type="url"
            placeholder="https://api.openai.com/v1"
            defaultValue={configQuery.data.openaiBaseUrl}
            onChange={(e) => {
              saveConfig({
                openaiBaseUrl: e.currentTarget.value,
              })
            }}
          />
        </Control>
      </ControlGroup>

      <ControlGroup title="Groq">
        <Control label="API Key" className="px-3">
          <Input
            type="password"
            defaultValue={configQuery.data.groqApiKey}
            onChange={(e) => {
              saveConfig({
                groqApiKey: e.currentTarget.value,
              })
            }}
          />
        </Control>

        <Control label="API Base URL" className="px-3">
          <Input
            type="url"
            placeholder="https://api.groq.com/openai/v1"
            defaultValue={configQuery.data.groqBaseUrl}
            onChange={(e) => {
              saveConfig({
                groqBaseUrl: e.currentTarget.value,
              })
            }}
          />
        </Control>
      </ControlGroup>

      <ControlGroup title="Gemini">
        <Control label="API Key" className="px-3">
          <Input
            type="password"
            defaultValue={configQuery.data.geminiApiKey}
            onChange={(e) => {
              saveConfig({
                geminiApiKey: e.currentTarget.value,
              })
            }}
          />
        </Control>

        <Control label="API Base URL" className="px-3">
          <Input
            type="url"
            placeholder="https://generativelanguage.googleapis.com"
            defaultValue={configQuery.data.geminiBaseUrl}
            onChange={(e) => {
              saveConfig({
                geminiBaseUrl: e.currentTarget.value,
              })
            }}
          />
        </Control>
      </ControlGroup>

      <ControlGroup title="SiliconFlow">
        <Control label="API Key" className="px-3">
          <Input
            type="password"
            defaultValue={configQuery.data.siliconflowApiKey}
            onChange={(e) => {
              saveConfig({
                siliconflowApiKey: e.currentTarget.value,
              })
            }}
          />
        </Control>

        <Control label="API Base URL" className="px-3">
          <Input
            type="url"
            placeholder="https://api.siliconflow.cn/v1"
            defaultValue={configQuery.data.siliconflowBaseUrl}
            onChange={(e) => {
              saveConfig({
                siliconflowBaseUrl: e.currentTarget.value,
              })
            }}
          />
        </Control>

        <Control label="Model" className="px-3">
          <Input
            type="text"
            placeholder="FunAudioLLM/SenseVoiceSmall"
            defaultValue={configQuery.data.siliconflowModel}
            onChange={(e) => {
              saveConfig({
                siliconflowModel: e.currentTarget.value,
              })
            }}
          />
        </Control>
      </ControlGroup>

      <ControlGroup title="Assembly AI">
        <Control label="API Key" className="px-3">
          <Input
            type="password"
            defaultValue={configQuery.data.assemblyaiApiKey}
            onChange={(e) => {
              saveConfig({
                assemblyaiApiKey: e.currentTarget.value,
              })
            }}
          />
        </Control>

        <Control label="API Base URL" className="px-3">
          <Input
            type="url"
            placeholder="https://api.assemblyai.com/v2"
            defaultValue={configQuery.data.assemblyaiBaseUrl}
            onChange={(e) => {
              saveConfig({
                assemblyaiBaseUrl: e.currentTarget.value,
              })
            }}
          />
        </Control>

        <Control label="Language Detection" className="px-3">
          <Switch
            defaultChecked={configQuery.data.assemblyaiLanguageDetection}
            onCheckedChange={(checked) => {
              saveConfig({
                assemblyaiLanguageDetection: checked,
              })
            }}
          />
        </Control>

        <Control label="Language Confidence Threshold" className="px-3">
          <Input
            type="number"
            min="0"
            max="1"
            step="0.1"
            placeholder="0.7"
            defaultValue={configQuery.data.assemblyaiLanguageConfidenceThreshold?.toString()}
            onChange={(e) => {
              const value = parseFloat(e.currentTarget.value)
              if (!isNaN(value) && value >= 0 && value <= 1) {
                saveConfig({
                  assemblyaiLanguageConfidenceThreshold: value,
                })
              }
            }}
          />
        </Control>
      </ControlGroup>
    </div>
  )
}

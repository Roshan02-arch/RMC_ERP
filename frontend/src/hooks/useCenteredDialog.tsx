import { useMemo, useState } from "react";

type DialogKind = "message" | "confirm" | "prompt" | "select";

type DialogState = {
  kind: DialogKind;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  placeholder?: string;
  options?: string[];
  resolve: (value: any) => void;
} | null;

type PromptOptions = {
  title?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type SelectOptions = {
  title?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export const useCenteredDialog = () => {
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [promptValue, setPromptValue] = useState("");

  const closeDialog = (result: any) => {
    if (!dialogState) return;
    const resolver = dialogState.resolve;
    setDialogState(null);
    resolver(result);
  };

  const showMessage = (message: string, title = "Message") =>
    new Promise<void>((resolve) => {
      setDialogState({
        kind: "message",
        title,
        message,
        confirmLabel: "OK",
        resolve,
      });
    });

  const showConfirm = (
    message: string,
    title = "Confirm",
    confirmLabel = "OK",
    cancelLabel = "Cancel"
  ) =>
    new Promise<boolean>((resolve) => {
      setDialogState({
        kind: "confirm",
        title,
        message,
        confirmLabel,
        cancelLabel,
        resolve,
      });
    });

  const showPrompt = (message: string, options: PromptOptions = {}) =>
    new Promise<string | null>((resolve) => {
      setPromptValue(options.defaultValue ?? "");
      setDialogState({
        kind: "prompt",
        title: options.title || "Input",
        message,
        confirmLabel: options.confirmLabel || "Submit",
        cancelLabel: options.cancelLabel || "Cancel",
        placeholder: options.placeholder || "",
        resolve,
      });
    });

  const showSelect = (message: string, optionsList: string[], options: SelectOptions = {}) =>
    new Promise<string | null>((resolve) => {
      const fallbackValue = optionsList.length > 0 ? optionsList[0] : "";
      setPromptValue(options.defaultValue ?? fallbackValue);
      setDialogState({
        kind: "select",
        title: options.title || "Select",
        message,
        confirmLabel: options.confirmLabel || "Submit",
        cancelLabel: options.cancelLabel || "Cancel",
        options: optionsList,
        resolve,
      });
    });

  const dialogNode = useMemo(() => {
    if (!dialogState) return null;

    return (
      <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6">
          <h3 className="text-lg font-semibold text-gray-800">{dialogState.title}</h3>
          <p className="text-sm text-gray-700 mt-2">{dialogState.message}</p>

          {dialogState.kind === "prompt" && (
            <input
              autoFocus
              type="text"
              value={promptValue}
              placeholder={dialogState.placeholder}
              onChange={(e) => setPromptValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  closeDialog(promptValue);
                }
              }}
              className="mt-4 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          )}
          {dialogState.kind === "select" && (
            <select
              autoFocus
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              className="mt-4 w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
            >
              {(dialogState.options || []).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}

          <div className="mt-5 flex justify-end gap-2">
            {dialogState.kind !== "message" && (
              <button
                type="button"
                onClick={() =>
                  closeDialog(dialogState.kind === "prompt" || dialogState.kind === "select" ? null : false)
                }
                className="px-4 py-2 text-sm rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800"
              >
                {dialogState.cancelLabel || "Cancel"}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (dialogState.kind === "confirm") {
                  closeDialog(true);
                  return;
                }
                if (dialogState.kind === "prompt") {
                  closeDialog(promptValue);
                  return;
                }
                if (dialogState.kind === "select") {
                  closeDialog(promptValue);
                  return;
                }
                closeDialog(undefined);
              }}
              className="px-4 py-2 text-sm rounded-md bg-gray-900 hover:bg-gray-800 text-white"
            >
              {dialogState.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }, [dialogState, promptValue]);

  return {
    showMessage,
    showConfirm,
    showPrompt,
    showSelect,
    dialogNode,
  };
};

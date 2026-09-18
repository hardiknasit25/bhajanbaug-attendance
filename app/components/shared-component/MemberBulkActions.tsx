import { useRef, useState } from "react";
import { Link } from "react-router";
import {
  CirclePlus,
  Download,
  FileDown,
  MoreVertical,
  QrCode,
  Upload,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { memberService } from "~/services/memberService";
import { usePermission } from "~/hooks/usePermissions";

interface ImportFailure {
  row: number;
  mobile: string | null;
  error: string;
}
interface ImportResult {
  total: number;
  created: number;
  updated: number;
  failed: ImportFailure[];
}

function triggerDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function MemberBulkActions({ onImported }: { onImported?: () => void }) {
  // Gate member management actions by the "member" module permission.
  const { canRead, canCreate } = usePermission("member");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState<
    "template" | "export" | "import" | "qr" | null
  >(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultOpen, setResultOpen] = useState(false);

  const handleTemplate = async () => {
    setMenuOpen(false);
    try {
      setBusy("template");
      const blob = await memberService.downloadTemplate();
      triggerDownload(blob, "members_import_template.xlsx");
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to download template");
      setResult(null);
      setResultOpen(true);
    } finally {
      setBusy(null);
    }
  };

  const handleExport = async () => {
    setMenuOpen(false);
    try {
      setBusy("export");
      const blob = await memberService.exportMembers();
      triggerDownload(blob, "members_export.xlsx");
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to export members");
      setResult(null);
      setResultOpen(true);
    } finally {
      setBusy(null);
    }
  };

  const handleDownloadQr = async () => {
    setMenuOpen(false);
    try {
      setBusy("qr");
      const blob = await memberService.downloadQrCodes();
      triggerDownload(blob, "member_qr_codes.pdf");
    } catch (e: any) {
      setErrorMsg(
        e?.response?.data?.message || e?.message || "Failed to download QR codes",
      );
      setResult(null);
      setResultOpen(true);
    } finally {
      setBusy(null);
    }
  };

  const handleImportClick = () => {
    setMenuOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // reset so selecting the same file again still fires onChange
    e.target.value = "";
    if (!file) return;
    try {
      setBusy("import");
      const response = await memberService.importMembers(file);
      setErrorMsg(null);
      setResult(response?.data ?? null);
      setResultOpen(true);
      onImported?.();
    } catch (err: any) {
      setResult(null);
      setErrorMsg(
        err?.response?.data?.message || err?.message || "Import failed",
      );
      setResultOpen(true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Add member */}
      {canCreate && (
        <Link to="/members/create-member" aria-label="Add member">
          <CirclePlus size={25} />
        </Link>
      )}

      {/* Bulk actions menu */}
      {canRead && (
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Bulk actions"
            disabled={!!busy}
            className="flex items-center justify-center disabled:opacity-50"
          >
            <MoreVertical size={22} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-56 p-1 text-textColor"
        >
          <button
            type="button"
            onClick={handleTemplate}
            className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-gray-100 text-left"
          >
            <FileDown size={18} className="text-primaryColor" />
            <span>Download template</span>
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-gray-100 text-left"
          >
            <Download size={18} className="text-primaryColor" />
            <span>Export members</span>
          </button>
          {/* QR feature hidden from the UI (kept for future use).
          <button
            type="button"
            onClick={handleDownloadQr}
            className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-gray-100 text-left"
          >
            <QrCode size={18} className="text-primaryColor" />
            <span>Download QR codes</span>
          </button>
          */}
          {canCreate && (
            <button
              type="button"
              onClick={handleImportClick}
              className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-gray-100 text-left"
            >
              <Upload size={18} className="text-primaryColor" />
              <span>Import members</span>
            </button>
          )}
        </PopoverContent>
      </Popover>
      )}

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Loading hint while a bulk action runs */}
      {busy && (
        <span className="text-xs text-white/80">
          {busy === "import"
            ? "Importing…"
            : busy === "export"
              ? "Exporting…"
              : "Preparing…"}
        </span>
      )}

      {/* Import result / error dialog */}
      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent className="text-textColor">
          <DialogHeader>
            <DialogTitle>
              {errorMsg ? "Something went wrong" : "Import complete"}
            </DialogTitle>
            <DialogDescription>
              {errorMsg
                ? errorMsg
                : result
                  ? `${result.total} row(s) processed.`
                  : "Done."}
            </DialogDescription>
          </DialogHeader>

          {!errorMsg && result && (
            <div className="space-y-2 text-sm">
              <div className="flex gap-4">
                <span className="text-green-600 font-medium">
                  Created: {result.created}
                </span>
                <span className="text-blue-600 font-medium">
                  Updated: {result.updated}
                </span>
                <span className="text-red-600 font-medium">
                  Failed: {result.failed.length}
                </span>
              </div>

              {result.failed.length > 0 && (
                <div className="max-h-48 overflow-auto rounded-md border border-borderColor p-2">
                  <p className="font-medium mb-1">Failed rows:</p>
                  <ul className="space-y-1">
                    {result.failed.map((f, i) => (
                      <li key={i} className="text-xs text-red-600">
                        Row {f.row}
                        {f.mobile ? ` (${f.mobile})` : ""}: {f.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setResultOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MemberBulkActions;

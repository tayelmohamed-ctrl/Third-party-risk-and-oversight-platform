import { ExternalLink } from "lucide-react";
import type { DriveFolderKey } from "../../config/cramDriveCatalogue";
import { driveDocPath, driveFolderUrl } from "../../config/cramDriveCatalogue";

interface DriveLinkProps {
  folderKey: DriveFolderKey;
  docPath?: string;
  label?: string;
  className?: string;
  compact?: boolean;
}

/** Opens the Google Drive folder (master repository). Doc path shown as audit hint. */
export default function DriveLink({ folderKey, docPath, label, className = "", compact }: DriveLinkProps) {
  const href = driveFolderUrl(folderKey);
  const display = label ?? (docPath ? driveDocPath(folderKey, docPath) : href);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-ai hover:underline text-[11px] ${className}`}
      title={docPath ? `Open Drive: ${driveDocPath(folderKey, docPath)}` : "Open Google Drive folder"}
    >
      {!compact && <ExternalLink size={12} className="shrink-0 opacity-80" aria-hidden />}
      <span className={compact ? "truncate max-w-[200px]" : ""}>{display}</span>
    </a>
  );
}

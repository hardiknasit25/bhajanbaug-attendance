import { Pencil, Trash2 } from "lucide-react";
import type { GroupData } from "~/types/group.interface";

interface GroupListCardProps {
  group: GroupData;
  onEdit: (group: GroupData) => void;
  onDelete: (group: GroupData) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

function GroupListCard({
  group,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}: GroupListCardProps) {
  return (
    <div className="w-full rounded-xl border border-borderColor bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <h3 className="text-base font-semibold capitalize text-textColor">
            {group.group_name}
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-eventCardColor px-2.5 py-0.5 text-xs font-medium capitalize text-eventCardBorderColor">
              {group.group_type}
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize text-textLightColor">
              Leader: {group.leader_name || "—"}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {canEdit && (
            <button
              type="button"
              onClick={() => onEdit(group)}
              aria-label={`Edit ${group.group_name}`}
              className="flex size-9 items-center justify-center rounded-full text-textLightColor transition-colors hover:bg-gray-100 hover:text-primaryColor"
            >
              <Pencil size={18} />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(group)}
              aria-label={`Delete ${group.group_name}`}
              className="flex size-9 items-center justify-center rounded-full text-deleteButtonColor transition-colors hover:bg-red-50"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default GroupListCard;

import { FALLBACK_AVATAR_PLACEHOLDER } from "~/constant/constant";
import CircularProgress from "./CircularProgress";
import { useMembers } from "~/hooks/useMembers";

function MemberDetailInfo() {
  const { selectedMember } = useMembers();
  const fullName = `${selectedMember?.first_name} ${selectedMember?.middle_name} ${selectedMember?.last_name}`;
  const totalSabha = selectedMember?.total_sabha || 1;
  const totalPresent = selectedMember?.total_present || 0;
  const percentageValue = Math.round((totalPresent * 100) / totalSabha) ?? 0;
  return (
    <div className="sticky top-0 w-full flex flex-col justify-start items-center border-b border-borderColor">
      <div className="w-full bg-primaryColor flex justify-start gap-4 items-start px-4 pb-4">
        <div className="min-w-20 max-w-20 min-h-20 max-h-20 border-2 border-borderColor p-1 rounded-full">
          <img
            src={FALLBACK_AVATAR_PLACEHOLDER}
            alt=""
            className="h-full w-full object-cover rounded-full"
          />
        </div>

        <div className="flex flex-col justify-start items-start gap-1 pt-4">
          <span className="text-base text-white capitalize">{fullName}</span>

          <div className="flex justify-start items-center gap-4">
            <span className="text-textLightColor text-sm border-r border-borderColor pr-4">
              SMK ID:{" "}
              <span className="text-white">
                {selectedMember?.smk_no ?? "No SMK"}
              </span>
            </span>
            <span className="text-textLightColor text-sm">
              ID: <span className="text-white">{selectedMember?.id}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="w-full flex justify-evenly items-start bg-white p-2">
        <div className="flex flex-col justify-start items-center">
          <span className="text-green-500 text-xl">
            {selectedMember?.total_present}/{selectedMember?.total_sabha}
          </span>
          <p className="flex justify-center items-center text-sm font-medium rounded-full text-textColor">
            Present
          </p>
        </div>
        <div className="flex flex-col justify-start items-center">
          <span className="text-redTextColor text-xl">
            {selectedMember?.total_absent}/{selectedMember?.total_sabha}
          </span>
          <p className="flex justify-center items-center text-sm font-medium rounded-full text-textColor">
            Absent
          </p>
        </div>
        <div className="flex justify-start items-center gap-2 px-4">
          <CircularProgress size={45} strokeWidth={2} value={percentageValue} />
        </div>
      </div>
    </div>
  );
}

export default MemberDetailInfo;

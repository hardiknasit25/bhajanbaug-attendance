import { CirclePlus } from "lucide-react";
import { useEffect } from "react";
import {
  Link,
  redirect,
  useSearchParams,
  type LoaderFunctionArgs,
} from "react-router";
import { Virtuoso } from "react-virtuoso";
import SabhaFormDialog from "~/components/forms/SabhaForm";
import EventCard from "~/components/shared-component/EventCard";
import LayoutWrapper from "~/components/shared-component/LayoutWrapper";
import LoadingSpinner from "~/components/shared-component/LoadingSpinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useSabha } from "~/hooks/useSabha";
import { useMyPermissions } from "~/hooks/usePermissions";
import { cn } from "~/lib/utils";
import { getTokenFromRequest } from "~/utils/getTokenFromRequest";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const token = getTokenFromRequest(request);

  if (!token) {
    return redirect("/login");
  }

  return null;
};

type SabhaTabs = "upcoming-sabha" | "completed-sabha";

export default function Sabha() {
  const {
    sabhaList,
    loading: sabhaLoading,
    totalSabha,
    setSabhaList,
    fetchSabhaList,
    openSabhaFormDialog,
  } = useSabha();

  // --------------------------
  // PERMISSIONS (gate each sub-tab by its own module)
  // --------------------------
  const { can, myLoaded } = useMyPermissions();
  // Permissive until the map loads, then strictly gated by the module.
  const canUpcoming = !myLoaded || can("upcoming_sabha", "read");
  const canCompleted = !myLoaded || can("completed_sabha", "read");

  // --------------------------
  // SEARCH PARAMS
  // --------------------------
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab =
    (searchParams.get("tab") as SabhaTabs) || "upcoming-sabha";
  // Fall back to a tab the user can actually access.
  const activeTab: SabhaTabs =
    requestedTab === "completed-sabha"
      ? canCompleted
        ? "completed-sabha"
        : "upcoming-sabha"
      : canUpcoming
        ? "upcoming-sabha"
        : "completed-sabha";

  // --------------------------
  // FETCH SABHA DATA
  // --------------------------
  const fetchSabhaListData = async () => {
    setSabhaList([]);
    const data = await fetchSabhaList(
      activeTab === "upcoming-sabha" ? "upcoming" : "completed",
    ).unwrap();
    return data.rows;
  };

  // FETCH WHEN TAB CHANGES
  useEffect(() => {
    fetchSabhaListData();
  }, [activeTab]);

  // CLEAR LIST ON UNMOUNT
  useEffect(() => {
    return () => {
      setSabhaList([]);
    };
  }, []);

  return (
    <LayoutWrapper
      headerConfigs={{
        title: "Sabha",
        // Creating a sabha needs the "sabha" create permission.
        children: can("sabha", "create") ? (
          <CirclePlus
            role="button"
            aria-label="Create sabha"
            onClick={() => {
              openSabhaFormDialog(null);
            }}
          />
        ) : undefined,
      }}
    >
      <Tabs
        value={activeTab}
        onValueChange={(val) => setSearchParams({ tab: val })}
        className="w-full h-full flex flex-col justify-start"
      >
        <TabsList className="w-full bg-primaryColor rounded-none justify-evenly h-10 pb-2">
          {canUpcoming && (
            <TabsTrigger value="upcoming-sabha">Upcoming Sabha</TabsTrigger>
          )}
          {canCompleted && (
            <TabsTrigger value="completed-sabha">Completed Sabha</TabsTrigger>
          )}
        </TabsList>

        {myLoaded && !canUpcoming && !canCompleted && (
          <div className="mt-10 text-center text-textLightColor">
            You don&apos;t have access to any sabha view.
          </div>
        )}

        {/* UPCOMING SABHA */}
        {canUpcoming && (
        <TabsContent value="upcoming-sabha" className="h-full w-full p-4">
          {sabhaLoading ? (
            <LoadingSpinner />
          ) : (
            <Virtuoso
              totalCount={sabhaList.length}
              data={sabhaList}
              itemContent={(index, sabha) => {
                return (
                  <div key={sabha?.id} className={cn("w-full mb-4")}>
                    <EventCard sabha={sabha} />
                  </div>
                );
              }}
              components={{
                Footer: () => {
                  return (
                    sabhaList.length === 0 && (
                      <div className="text-center mt-2 text-textLightColor">
                        No sabha found
                      </div>
                    )
                  );
                },
              }}
              className="scrollbar-none"
            />
          )}
        </TabsContent>
        )}

        {/* COMPLETED SABHA */}
        {canCompleted && (
        <TabsContent value="completed-sabha" className="p-4 w-full h-full">
          {sabhaLoading ? (
            <LoadingSpinner />
          ) : (
            <Virtuoso
              totalCount={totalSabha}
              data={sabhaList}
              itemContent={(index, sabha) => {
                return (
                  <div key={sabha?.id} className="w-full mb-4">
                    <EventCard sabha={sabha} />
                  </div>
                );
              }}
              components={{
                Footer: () => {
                  return (
                    sabhaList.length === 0 && (
                      <div className="text-center mt-2 text-textLightColor">
                        No sabha found
                      </div>
                    )
                  );
                },
              }}
            />
          )}
        </TabsContent>
        )}
      </Tabs>

      <SabhaFormDialog />
    </LayoutWrapper>
  );
}

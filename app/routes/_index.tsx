import { useEffect, useState } from "react";
import { redirect, type LoaderFunctionArgs, type MetaArgs } from "react-router";
import LayoutWrapper from "~/components/shared-component/LayoutWrapper";
import LoadingSpinner from "~/components/shared-component/LoadingSpinner";
import WishesCard from "~/components/shared-component/WishesCard";
import { memberService } from "~/services/memberService";
import type { Wish } from "~/types/wishes.interface";
import { getTokenFromRequest } from "~/utils/getTokenFromRequest";

export function meta({}: MetaArgs) {
  return [
    { title: "Bhajanbaug Sabha" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const token = getTokenFromRequest(request);

  if (!token) {
    return redirect("/login");
  }

  return null;
};

export default function Home() {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    memberService
      .getWishes()
      .then((res) => {
        if (active) setWishes(res?.data ?? []);
      })
      .catch(() => {
        if (active) {
          setWishes([]);
          setLoadFailed(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <LayoutWrapper
      headerConfigs={{
        title: "Bhajan baug",
      }}
      className="p-4"
    >
      <div className="w-full aspect-video rounded-xl overflow-hidden mb-4">
        <img
          src="images/homePageChopai.jpg"
          alt="home_page_chopai"
          className="h-full w-full object-cover bg-slate-100"
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : loadFailed ? (
        <div className="mt-6 text-center text-textLightColor">
          Could not load birthdays. Please try again.
        </div>
      ) : wishes.length === 0 ? (
        <div className="mt-6 text-center text-textLightColor">
          No upcoming birthdays
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {wishes.map((wish) => (
            <WishesCard key={`${wish.type}-${wish.id}`} wish={wish} />
          ))}
        </div>
      )}
    </LayoutWrapper>
  );
}

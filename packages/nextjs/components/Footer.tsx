import React from "react";
import { Address } from "@scaffold-ui/components";
import { SwitchTheme } from "~~/components/SwitchTheme";

const PROVING_GROUNDS_ADDRESS = "0x72F6325C70d4cdfE14b55036090017B85628Abbc";

/**
 * Site footer
 */
export const Footer = () => {
  return (
    <div className="min-h-0 py-5 px-1 mb-11 lg:mb-0">
      <div>
        <div className="fixed flex justify-end items-center w-full z-10 p-4 bottom-0 left-0 pointer-events-none">
          <SwitchTheme className="pointer-events-auto" />
        </div>
      </div>
      <div className="w-full">
        <div className="flex flex-col justify-center items-center gap-2 text-sm w-full">
          <div className="flex flex-col sm:flex-row justify-center items-center gap-2">
            <span className="font-bold">The Proving Grounds</span>
            <span className="hidden sm:inline">·</span>
            <span>Powered by LeftClaw</span>
          </div>
          <div className="flex justify-center items-center gap-2">
            <span className="text-xs opacity-70">Contract:</span>
            <Address address={PROVING_GROUNDS_ADDRESS} />
          </div>
        </div>
      </div>
    </div>
  );
};

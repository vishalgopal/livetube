"use client";

import { ReactNode } from "react";

interface ConfirmSubmitButtonProps {
  children: ReactNode;
  className: string;
  confirmMessage: string;
  title?: string;
}

export default function ConfirmSubmitButton({
  children,
  className,
  confirmMessage,
  title,
}: ConfirmSubmitButtonProps) {
  return (
    <button
      type="button"
      title={title}
      className={className}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          return;
        }

        const form = event.currentTarget.closest("form");
        form?.requestSubmit();
      }}
    >
      {children}
    </button>
  );
}

"use client";

import { DatePicker } from "antd";
import dayjs from "dayjs";

import type { ISODate } from "@/lib/dates";

/** Thin wrapper around antd's DatePicker that speaks the app's plain
 * "YYYY-MM-DD" strings instead of dayjs objects. */
export function DateField({
  value,
  onChange,
  max,
  allowClear = false,
  className = "",
}: {
  value: ISODate | "";
  onChange: (value: ISODate | "") => void;
  max?: ISODate;
  allowClear?: boolean;
  className?: string;
}) {
  return (
    <DatePicker
      value={value ? dayjs(value) : null}
      onChange={(next) => onChange(next ? next.format("YYYY-MM-DD") : "")}
      maxDate={max ? dayjs(max) : undefined}
      format="DD/MM/YYYY"
      allowClear={allowClear}
      className={`h-10 w-full rounded-full ${className}`}
    />
  );
}

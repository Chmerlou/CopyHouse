"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import styles from "./provider-orders.module.css";

type Point = { id: string; address: string };
const sectorWidth = 144;
const rowBorders = 4;

export function PointSwitcher({ points, selectedId, selectPoint }: {
  points: Point[];
  selectedId?: string;
  selectPoint: (form: FormData) => void | Promise<void>;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [capacity, setCapacity] = useState(2);

  useLayoutEffect(() => {
    const element = form.current;
    if (!element) return;
    const measure = () => setCapacity(Math.max(1, Math.floor((element.clientWidth - rowBorders) / sectorWidth)));
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const rowCount = Math.ceil(points.length / capacity);
  const rowSize = Math.floor(points.length / rowCount);
  const longerRows = points.length % rowCount;

  return (
    <form ref={form} action={selectPoint} className={styles.switcher} role="group" aria-label="Точки печати">
      {Array.from({ length: rowCount }, (_, index) => {
        const start = index * rowSize + Math.min(index, longerRows);
        const size = rowSize + Number(index < longerRows);
        return (
          <ul key={index} role="list" className={styles.pointRow}>
            {points.slice(start, start + size).map((point) => (
              <li key={point.id}><PointChoice point={point} selected={point.id === selectedId} /></li>
            ))}
          </ul>
        );
      })}
    </form>
  );
}

function PointChoice({ point, selected }: { point: Point; selected: boolean }) {
  const { pending } = useFormStatus();
  const label = useRef<HTMLSpanElement>(null);
  const full = useRef<HTMLSpanElement>(null);
  const [fits, setFits] = useState(true);
  const address = Array.from(point.address);
  const shortAddress = address.length > 12 ? `${address.slice(0, 9).join("")}...` : point.address;
  const shownAddress = address.length <= 18 && fits ? point.address : shortAddress;

  useLayoutEffect(() => {
    const visible = label.current;
    const measurement = full.current;
    if (!visible || !measurement) return;
    const measure = () => setFits(measurement.scrollWidth <= visible.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(visible);
    observer.observe(measurement);
    return () => observer.disconnect();
  }, []);

  return (
    <button
      type="submit" name="pointId" value={point.id} className={styles.pointChoice}
      aria-label={point.address} aria-pressed={selected} title={shownAddress === point.address ? undefined : point.address} disabled={pending}
    >
      <span ref={label} className={styles.pointLabel} aria-hidden="true">{shownAddress}</span>
      <span ref={full} className={styles.measurement} aria-hidden="true">{point.address}</span>
      {shownAddress !== point.address && <span className={styles.pointTooltip} aria-hidden="true">{point.address}</span>}
    </button>
  );
}

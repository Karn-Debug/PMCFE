import type { ReactNode, ButtonHTMLAttributes } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  Loader2,
  ArrowUpRight,
  Inbox,
  AlertCircle,
  CheckCircle2,
  Clock3,
  CircleDot,
  Minus,
} from "lucide-react";
import { statusTone } from "./status";
import clsx from "clsx";
import { initials } from "./api";
export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button className={clsx("btn", "btn-" + variant, className)} {...props}>
      {children}
    </button>
  );
}
export function Badge({ status }: { status: string }) {
  const tone = statusTone(status);
  const Icon = {
    green: CheckCircle2,
    blue: CircleDot,
    amber: Clock3,
    red: AlertCircle,
    neutral: Minus,
  }[tone];
  return (
    <span className={clsx("badge", tone)}>
      <Icon size={13} aria-hidden="true" />
      {status}
    </span>
  );
}
export function Avatar({
  name,
  size = "normal",
}: {
  name: string;
  size?: string;
}) {
  return <span className={"avatar " + size}>{initials(name)}</span>;
}
export function PageHead({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{actions}</div>
    </div>
  );
}
export function Modal({
  title,
  description,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <Dialog.Root open onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className={clsx("modal", wide && "modal-wide")}>
          <div className="modal-header">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>
                {description || "Review the details below."}
              </Dialog.Description>
            </div>
            <Dialog.Close className="icon-btn" aria-label="Close dialog">
              <X size={20} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Empty({
  title = "Nothing here yet",
  text = "Add the first record to get started.",
  action,
}: {
  title?: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span>
        <Inbox size={28} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading">
      <Loader2 className="spin" size={24} />
      <span>Bringing your workspace together…</span>
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <div className="empty error-state" role="alert">
      <AlertCircle size={30} />
      <h3>Unable to load this view</h3>
      <p>{error instanceof Error ? error.message : "Please try again."}</p>
      <Button onClick={retry}>Try again</Button>
    </div>
  );
}
export function Progress({ value }: { value: number }) {
  return (
    <div className="progress-wrap">
      <div
        className="progress-track"
        data-complete={value >= 100}
        role="progressbar"
        aria-label="Overall progress"
        aria-valuenow={Math.max(0, Math.min(100, value))}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: Math.max(0, Math.min(100, value)) + "%" }} />
      </div>
      <small>{value}%</small>
    </div>
  );
}
export function SectionTitle({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {action}
    </div>
  );
}
export function Architecture({ variant = 0 }: { variant?: number }) {
  return (
    <div className={"architecture architecture-" + variant} aria-hidden="true">
      <div className="building b1" />
      <div className="building b2" />
      <div className="building b3" />
      <div className="building b4" />
      <div className="ground" />
    </div>
  );
}
export { ArrowUpRight };

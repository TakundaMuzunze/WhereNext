/* eslint-disable @next/next/no-img-element */

type UserAvatarProps = {
  image?: string | null;
  name?: string | null;
  email?: string | null;
  size?: "small" | "large" | "profile";
};

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  return email?.[0]?.toUpperCase() ?? "?";
}

export function UserAvatar({ image, name, email, size = "small" }: UserAvatarProps) {
  const sizeClasses = {
    small: "h-9 w-9 text-xs",
    large: "h-11 w-11 text-sm",
    profile: "h-20 w-20 text-xl sm:h-24 sm:w-24 sm:text-2xl",
  }[size];

  if (image) {
    // Identity-provider images can use changing remote hosts, so they cannot be safely covered by a fixed Next Image allowlist.
    return (
      <img src={image} alt="" referrerPolicy="no-referrer" className={`${sizeClasses} shrink-0 rounded-full object-cover ring-4 ring-secondary/20`} />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`grid ${sizeClasses} shrink-0 place-items-center rounded-full bg-primary font-semibold text-white ring-4 ring-secondary/20 dark:text-[#101214]`}
    >
      {getInitials(name, email)}
    </span>
  );
}

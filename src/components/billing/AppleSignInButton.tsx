import { signInWithApple } from "../../services/core/accountAuth";
import { OAuthSignInButton } from "./OAuthSignInButton";

interface AppleSignInButtonProps {
  disabled?: boolean;
  onSuccess: () => void | Promise<void>;
  onError: (message: string) => void;
}

export function AppleSignInButton({
  disabled = false,
  onSuccess,
  onError,
}: AppleSignInButtonProps) {
  return (
    <OAuthSignInButton
      provider="apple"
      disabled={disabled}
      onSignIn={signInWithApple}
      onSuccess={onSuccess}
      onError={onError}
      label="Continue with Apple"
      icon={
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.48-.12-1.06.46-2.2 1.115-3.01.787-.94 2.066-1.63 3.049-1.55zM20.64 17.07c-.577 1.32-.857 1.91-1.603 3.08-1.04 1.62-2.505 3.64-4.322 3.66-1.617.02-2.026-.95-4.212-.94-2.186.01-2.623.96-4.24.94-1.817-.02-3.213-1.88-4.253-3.5-2.915-4.48-3.23-9.73-1.425-12.51 1.292-2.01 3.343-3.2 5.653-3.2 2.106 0 3.43 1.01 5.17 1.01 1.687 0 2.715-1.01 5.145-1.01 1.84 0 3.787 1 5.05 2.73-4.443 2.43-3.72 8.75.757 10.74z" />
        </svg>
      }
    />
  );
}

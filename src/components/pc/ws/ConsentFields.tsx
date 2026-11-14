import type { z } from "zod";
import type { ConsentSchema } from "@/lib/engine/intelligence";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type Consent = z.infer<typeof ConsentSchema>;
export const defaultConsent: Consent = {
  organization_type: "individual",
  organization_name: "",
  ai_consent: false,
  code_consent: false,
  test_consent: false,
  fix_consent: false,
};
export function ConsentFields({
  value,
  onChange,
}: {
  value: Consent;
  onChange: (v: Consent) => void;
}) {
  const scopes = [
    ["ai_consent", "I authorize Gemini to analyze this project's reports and permitted evidence."],
    ["code_consent", "I am authorized to share this codebase for read-only AI analysis."],
    ["test_consent", "I authorize controlled tests against this project's website."],
    ["fix_consent", "I authorize AI fix proposals; applying any fix still requires my approval."],
  ] as const;
  return (
    <fieldset className="space-y-4 border-t border-border py-4">
      <legend className="font-semibold">Organization & permissions</legend>
      <Label htmlFor="organization-type">Are you from a private or public organization?</Label>
      <Select
        value={value.organization_type}
        onValueChange={(v) => {
          if (v === "individual" || v === "private" || v === "public")
            onChange({ ...value, organization_type: v });
        }}
      >
        <SelectTrigger id="organization-type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="individual">Individual / independent</SelectItem>
          <SelectItem value="private">Private organization</SelectItem>
          <SelectItem value="public">Public organization</SelectItem>
        </SelectContent>
      </Select>
      {value.organization_type !== "individual" && (
        <div>
          <Label htmlFor="organization-name">Organization name</Label>
          <Input
            id="organization-name"
            required
            value={value.organization_name}
            onChange={(e) => onChange({ ...value, organization_name: e.target.value })}
          />
        </div>
      )}
      <p className="text-xs text-warning">
        Only share material your organization permits. Remove secrets and personal data. Permission
        here does not grant access to a private GitHub repository.
      </p>
      {scopes.map(([key, text]) => (
        <div key={key} className="flex items-start gap-3">
          <Checkbox
            id={key}
            checked={value[key]}
            onCheckedChange={(v) => onChange({ ...value, [key]: v === true })}
          />
          <Label htmlFor={key} className="leading-relaxed">
            {text}
          </Label>
        </div>
      ))}
    </fieldset>
  );
}

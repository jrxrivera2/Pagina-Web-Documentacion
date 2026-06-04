import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { FlagsRolUsuario } from "@/lib/admin-roles";

interface Props {
  value: FlagsRolUsuario;
  onChange: (value: FlagsRolUsuario) => void;
  disabled?: boolean;
}

export function PermisosRolCheckboxes({ value, onChange, disabled }: Props) {
  const setAdmin = (checked: boolean) => {
    if (checked) {
      onChange({ esAdministrador: true, esEmisor: false, esReceptor: false });
    } else {
      onChange({ ...value, esAdministrador: false });
    }
  };

  const setEmisor = (checked: boolean) => {
    onChange({ ...value, esEmisor: checked, esAdministrador: false });
  };

  const setReceptor = (checked: boolean) => {
    onChange({ ...value, esReceptor: checked, esAdministrador: false });
  };

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      <p className="text-xs font-medium text-muted-foreground">Permisos del usuario</p>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="perm-admin"
            checked={value.esAdministrador}
            onCheckedChange={(c) => setAdmin(c === true)}
            disabled={disabled}
          />
          <Label htmlFor="perm-admin" className="cursor-pointer font-normal">
            Administrador (acceso total al sistema)
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="perm-emisor"
            checked={value.esEmisor}
            onCheckedChange={(c) => setEmisor(c === true)}
            disabled={disabled || value.esAdministrador}
          />
          <Label htmlFor="perm-emisor" className="cursor-pointer font-normal">
            Emisor (crear y enviar documentos)
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="perm-receptor"
            checked={value.esReceptor}
            onCheckedChange={(c) => setReceptor(c === true)}
            disabled={disabled || value.esAdministrador}
          />
          <Label htmlFor="perm-receptor" className="cursor-pointer font-normal">
            Receptor (ver bandeja, aprobar o rechazar)
          </Label>
        </div>
      </div>
      {value.esEmisor && value.esReceptor && !value.esAdministrador && (
        <p className="text-xs text-muted-foreground">
          Con ambos permisos el usuario podra enviar y responder documentos.
        </p>
      )}
    </div>
  );
}

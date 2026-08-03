import { AlertTriangle } from 'lucide-react';
import type { IntelligenceResult } from '@/lib/intelligence/types';
import type { WizardFormState } from '@/lib/design-studio/wizard-types';
import { buildDesignStudioOutput, type DesignStudioSource } from '@/lib/intelligence/designStudioBuilder';
import { DesignStudioOutputView } from './DesignStudioOutputView';

interface Props {
  recommendation: IntelligenceResult;
  acceptedSource: DesignStudioSource;
  form: WizardFormState;
  onNext: () => void;
  onBack: () => void;
}

export function StepDesignStudio({ recommendation, acceptedSource, form, onNext, onBack }: Props) {
  const output = buildDesignStudioOutput(recommendation, acceptedSource, form);

  if (!output) {
    return (
      <div
        className="rounded-2xl border p-8 flex flex-col items-center justify-center gap-4 min-h-[280px]"
        style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.15)' }}
      >
        <div className="grid h-12 w-12 place-items-center rounded-full bg-red-500/15 border border-red-500/30">
          <AlertTriangle className="h-6 w-6 text-red-400" aria-hidden="true" />
        </div>
        <p className="text-white font-medium">No design data available</p>
        <button
          type="button"
          onClick={onBack}
          className="h-10 px-6 rounded-lg text-sm text-white/60 hover:text-white border border-white/10 hover:border-white/20 transition-colors"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DesignStudioOutputView output={output} />

      {/* ── Action bar ── */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="h-10 px-6 rounded-lg text-sm text-white/60 hover:text-white border border-white/10 hover:border-white/20 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="h-10 px-8 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
          style={{ background: '#378ADD' }}
        >
          Proceed to Review →
        </button>
      </div>
    </div>
  );
}

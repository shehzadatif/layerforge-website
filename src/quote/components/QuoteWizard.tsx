import { useState } from "react";
import DropZone from "./DropZone";

export default function QuoteWizard() {
  const [step, setStep] = useState(1);
  const [service, setService] = useState("");

  return (
    <div className="mx-auto max-w-5xl rounded-3xl bg-white p-10 shadow-2xl">

      {/* Header */}

      <h2 className="text-4xl font-bold text-slate-900">
        Instant Quote Builder
      </h2>

      <p className="mt-3 text-lg text-slate-600">
        Configure your project and receive an instant estimate.
      </p>

      {/* Progress */}

      <div className="mt-10">

        <div className="flex justify-between text-sm font-semibold text-slate-500">

          <span className={step >= 1 ? "text-yellow-500" : ""}>Service</span>

          <span className={step >= 2 ? "text-yellow-500" : ""}>Project</span>

          <span className={step >= 3 ? "text-yellow-500" : ""}>Files</span>

          <span className={step >= 4 ? "text-yellow-500" : ""}>Material</span>

          <span className={step >= 5 ? "text-yellow-500" : ""}>Estimate</span>

        </div>

        <div className="mt-2 h-2 rounded-full bg-slate-200">

          <div
            className="h-2 rounded-full bg-yellow-400 transition-all duration-500"
            style={{ width: `${step * 20}%` }}
          />

        </div>

      </div>

      {/* STEP 1 */}

      {step === 1 && (

        <div className="mt-12">

          <h3 className="mb-8 text-2xl font-bold">
            Choose Your Service
          </h3>

          <div className="grid gap-6 md:grid-cols-3">

            {/* 3D */}

            <button
              onClick={() => {
                setService("3D Printing");
                setStep(2);
              }}
              className="rounded-2xl border p-8 text-left transition hover:border-yellow-400 hover:shadow-lg"
            >
              <div className="text-5xl">🖨️</div>

              <h4 className="mt-6 text-2xl font-bold">
                3D Printing
              </h4>

              <p className="mt-4 text-slate-600">
                Functional parts, prototypes and custom manufacturing.
              </p>

            </button>

            {/* Laser */}

            <button
              onClick={() => {
                setService("Laser Engraving");
                setStep(2);
              }}
              className="rounded-2xl border p-8 text-left transition hover:border-yellow-400 hover:shadow-lg"
            >
              <div className="text-5xl">🔥</div>

              <h4 className="mt-6 text-2xl font-bold">
                Laser Engraving
              </h4>

              <p className="mt-4 text-slate-600">
                Personalized gifts, signage and engraving.
              </p>

            </button>

            {/* UV */}

            <button
              onClick={() => {
                setService("UV Printing");
                setStep(2);
              }}
              className="rounded-2xl border p-8 text-left transition hover:border-yellow-400 hover:shadow-lg"
            >
              <div className="text-5xl">🎨</div>

              <h4 className="mt-6 text-2xl font-bold">
                UV Printing
              </h4>

              <p className="mt-4 text-slate-600">
                Promotional products, drinkware and business branding.
              </p>

            </button>

          </div>

        </div>

      )}

      {/* STEP 2 */}

      {step === 2 && (

        <div className="mt-12">

          <h3 className="text-3xl font-bold">
            Project Details
          </h3>

          <p className="mt-2 text-slate-600">
            Selected Service:
            <span className="ml-2 font-semibold text-yellow-600">
              {service}
            </span>
          </p>

          <div className="mt-8 space-y-6">

            <div>

              <label className="block font-semibold">
                Project Name
              </label>

              <input
                type="text"
                className="mt-2 w-full rounded-lg border p-3"
                placeholder="Battery Mount"
              />

            </div>

            <div>

              <label className="block font-semibold">
                Describe Your Project
              </label>

              <textarea
                rows={6}
                className="mt-2 w-full rounded-lg border p-3"
                placeholder="Tell us about your project..."
              />

            </div>

            <div>

              <label className="block font-semibold">
                Quantity
              </label>

              <input
                type="number"
                defaultValue={1}
                className="mt-2 w-40 rounded-lg border p-3"
              />

            </div>

          </div>

          <div className="mt-10 flex justify-between">

            <button
              onClick={() => setStep(1)}
              className="rounded-lg border px-6 py-3"
            >
              Back
            </button>

            <button
              onClick={() => setStep(3)}
              className="rounded-lg bg-yellow-400 px-8 py-3 font-semibold hover:bg-yellow-300"
            >
              Continue
            </button>

          </div>

        </div>

      )}

      {/* STEP 3 */}

      {step === 3 && (
  <div className="mt-12">

    <h3 className="text-3xl font-bold">
      Upload Your File
    </h3>

    <DropZone />

    <div className="mt-10 flex justify-between">

      <button
        onClick={() => setStep(2)}
        className="rounded-lg border px-6 py-3"
      >
        Back
      </button>

      <button
        onClick={() => setStep(4)}
        className="rounded-lg bg-yellow-400 px-8 py-3 font-semibold hover:bg-yellow-300"
      >
        Continue
      </button>

    </div>

  </div>
)}

      {/* STEP 4 */}

      {step === 4 && (

        <div className="mt-12">

          <h3 className="text-3xl font-bold">
            Materials & Options
          </h3>

          <div className="mt-8 space-y-6">

            <select className="w-full rounded-lg border p-3">

              <option>PLA</option>

              <option>PETG</option>

              <option>ABS</option>

              <option>ASA</option>

              <option>TPU</option>

            </select>

          </div>

          <div className="mt-10 flex justify-between">

            <button
              onClick={() => setStep(3)}
              className="rounded-lg border px-6 py-3"
            >
              Back
            </button>

            <button
              onClick={() => setStep(5)}
              className="rounded-lg bg-yellow-400 px-8 py-3 font-semibold hover:bg-yellow-300"
            >
              Continue
            </button>

          </div>

        </div>

      )}

      {/* STEP 5 */}

      {step === 5 && (

        <div className="mt-12">

          <h3 className="text-3xl font-bold">
            Estimated Quote
          </h3>

          <div className="mt-8 rounded-2xl bg-slate-100 p-8">

            <p className="text-lg">
              Estimated Material Cost
            </p>

            <p className="mt-2 text-3xl font-bold text-yellow-600">
              Coming Soon
            </p>

            <p className="mt-4 text-slate-500">
              Automatic pricing will be calculated from your uploaded files.
            </p>

          </div>

          <div className="mt-10 flex justify-between">

            <button
              onClick={() => setStep(4)}
              className="rounded-lg border px-6 py-3"
            >
              Back
            </button>

            <button
              className="rounded-lg bg-green-600 px-8 py-3 font-semibold text-white hover:bg-green-700"
            >
              Submit Quote Request
            </button>

          </div>

        </div>

      )}

    </div>
  );
}
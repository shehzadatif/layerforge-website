import { useEffect, useRef, useState } from "react";

import type { Province } from "../../../lib/shipping";
import type { CheckoutForm } from "../types";

interface Props {
  form: CheckoutForm;
  errors: Record<string, string>;
  updateField: (field: keyof CheckoutForm, value: string) => void;
}

interface AddressSuggestion {
  id: string;
  text: string;
  description: string;
  address: {
    line1: string;
    city: string;
    province: Province;
    postalCode: string;
    label: string;
  };
}

export default function ShippingAddress({ form, errors, updateField }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const requestController = useRef<AbortController | null>(null);
  const suppressNextSearch = useRef(false);
  const suggestionCache = useRef(new Map<string, AddressSuggestion[]>());

  async function findSuggestions(term: string) {
    const normalizedTerm = term.trim().toLowerCase();
    const cached = suggestionCache.current.get(normalizedTerm);

    if (cached) {
      setSuggestions(cached);
      setActiveIndex(cached.length > 0 ? 0 : -1);
      setHasSearched(true);
      return;
    }

    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setIsSearching(true);
    setLookupError("");

    try {
      const params = new URLSearchParams({ q: term });
      const response = await fetch(`/api/address-lookup?${params}`, {
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Address search is unavailable.");
      }

      const nextSuggestions = Array.isArray(result.suggestions)
        ? (result.suggestions as AddressSuggestion[])
        : [];

      suggestionCache.current.set(normalizedTerm, nextSuggestions);
      setSuggestions(nextSuggestions);
      setActiveIndex(nextSuggestions.length > 0 ? 0 : -1);
      setHasSearched(true);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;

      setSuggestions([]);
      setActiveIndex(-1);
      setHasSearched(true);
      setLookupError(
        error instanceof Error
          ? error.message
          : "Address search is unavailable.",
      );
    } finally {
      if (requestController.current === controller) {
        setIsSearching(false);
      }
    }
  }

  function selectSuggestion(suggestion: AddressSuggestion) {
    updateField("address", suggestion.address.line1);
    updateField("city", suggestion.address.city);
    updateField("province", suggestion.address.province);
    updateField("postalCode", suggestion.address.postalCode);
    suppressNextSearch.current = true;
    setSearchTerm(suggestion.address.label);
    setSuggestions([]);
    setActiveIndex(-1);
    setHasSearched(false);
    setLookupError("");
  }

  useEffect(() => {
    const normalizedTerm = searchTerm.trim();

    if (suppressNextSearch.current) {
      suppressNextSearch.current = false;
      return;
    }

    requestController.current?.abort();
    setIsSearching(false);
    setHasSearched(false);
    setLookupError("");

    if (normalizedTerm.length < 3) {
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }

    const timer = window.setTimeout(() => {
      void findSuggestions(normalizedTerm);
    }, 400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchTerm]);

  useEffect(
    () => () => {
      requestController.current?.abort();
    },
    [],
  );

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        (current) => (current <= 0 ? suggestions.length : current) - 1,
      );
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setSuggestions([]);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow">
      <h2 className="mb-6 text-2xl font-bold">Shipping Address</h2>

      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">
        Shipping is currently available to Canadian addresses only.
      </div>

      <div className="relative mb-7">
        <label
          htmlFor="canadian-address-search"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Find your Canadian address
        </label>
        <div className="relative">
          <input
            id="canadian-address-search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            onBlur={() => {
              window.setTimeout(() => {
                setSuggestions([]);
                setActiveIndex(-1);
              }, 150);
            }}
            placeholder="Start typing your street address"
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-controls="canadian-address-suggestions"
            aria-expanded={suggestions.length > 0}
            aria-activedescendant={
              activeIndex >= 0 ? `address-suggestion-${activeIndex}` : undefined
            }
            className="w-full rounded-xl border border-slate-300 p-4 pr-12 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          {isSearching && (
            <span
              aria-label="Searching addresses"
              className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800"
            />
          )}
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Powered by{" "}
          <a
            href="https://www.geoapify.com/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline underline-offset-2"
          >
            Geoapify
          </a>
          . You can also enter your address manually below.
        </p>

        {suggestions.length > 0 && (
          <div
            id="canadian-address-suggestions"
            role="listbox"
            className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-2 shadow-xl"
          >
            {suggestions.map((suggestion, index) => (
              <button
                id={`address-suggestion-${index}`}
                key={suggestion.id}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectSuggestion(suggestion)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`block w-full px-4 py-3 text-left transition ${
                  index === activeIndex ? "bg-yellow-50" : "hover:bg-slate-50"
                }`}
              >
                <span className="block font-semibold text-slate-900">
                  {suggestion.text}
                </span>
                {suggestion.description && (
                  <span className="mt-1 block text-sm text-slate-500">
                    {suggestion.description}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {!isSearching &&
          hasSearched &&
          suggestions.length === 0 &&
          !lookupError && (
            <p className="mt-2 text-sm text-slate-500">
              No matching address found. Enter it manually below.
            </p>
          )}

        {lookupError && (
          <p role="alert" className="mt-2 text-sm text-amber-700">
            {lookupError}
          </p>
        )}
      </div>

      <div className="mb-6 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Or enter manually
        </span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="grid gap-5">
        <div>
          <input
            id="manual-shipping-address"
            value={form.address}
            onChange={(event) => updateField("address", event.target.value)}
            placeholder="Street Address"
            autoComplete="off"
            className={`w-full rounded-xl border p-4 ${
              errors.address ? "border-red-500" : ""
            }`}
          />

          {errors.address && (
            <p className="mt-1 text-sm text-red-600">{errors.address}</p>
          )}
        </div>

        <input
          id="manual-shipping-unit"
          value={form.unit}
          onChange={(event) => updateField("unit", event.target.value)}
          placeholder="Apartment / Unit"
          autoComplete="off"
          className="rounded-xl border p-4"
        />

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <input
              id="manual-shipping-city"
              value={form.city}
              onChange={(event) => updateField("city", event.target.value)}
              placeholder="City"
              autoComplete="off"
              className={`w-full rounded-xl border p-4 ${
                errors.city ? "border-red-500" : ""
              }`}
            />

            {errors.city && (
              <p className="mt-1 text-sm text-red-600">{errors.city}</p>
            )}
          </div>

          <div>
            <input
              id="manual-shipping-postal-code"
              inputMode="text"
              value={form.postalCode}
              onChange={(event) =>
                updateField("postalCode", event.target.value)
              }
              placeholder="Postal Code"
              autoComplete="off"
              className={`w-full rounded-xl border p-4 ${
                errors.postalCode ? "border-red-500" : ""
              }`}
            />

            {errors.postalCode && (
              <p className="mt-1 text-sm text-red-600">{errors.postalCode}</p>
            )}
          </div>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">
            Province or territory
          </span>
          <select
            id="manual-shipping-province"
            value={form.province}
            onChange={(event) => updateField("province", event.target.value)}
            autoComplete="off"
            className="rounded-xl border p-4"
          >
            <option value="BC">British Columbia</option>
            <option value="AB">Alberta</option>
            <option value="SK">Saskatchewan</option>
            <option value="MB">Manitoba</option>
            <option value="ON">Ontario</option>
            <option value="QC">Quebec</option>
            <option value="NB">New Brunswick</option>
            <option value="NS">Nova Scotia</option>
            <option value="PE">Prince Edward Island</option>
            <option value="NL">Newfoundland &amp; Labrador</option>
            <option value="YT">Yukon</option>
            <option value="NT">Northwest Territories</option>
            <option value="NU">Nunavut</option>
          </select>
          <span className="text-sm text-slate-500">
            Your shipping rate updates from this selection.
          </span>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">Country</span>
          <input
            value="Canada"
            readOnly
            autoComplete="off"
            className="rounded-xl border bg-slate-100 p-4 text-slate-600"
          />
        </label>
      </div>
    </div>
  );
}

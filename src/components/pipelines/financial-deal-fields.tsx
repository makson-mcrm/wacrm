'use client';

import { Plus, X } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  BANK_OPTIONS,
  BANK_STATUS_OPTIONS,
  DEAL_TYPE_OPTIONS,
  FINANCIAL_GOAL_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  MISSING_ITEM_OPTIONS,
  PRODUCT_OPTIONS,
  questionnaireStatusLabel,
  type DealFinancialValues,
} from '@/lib/deals/financial-fields';
import type { Contact } from '@/types';

interface FinancialDealFieldsProps {
  value: DealFinancialValues;
  onChange: (value: DealFinancialValues) => void;
  contacts: Contact[];
  primaryContactId: string;
}

const selectClass =
  'h-9 w-full rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary';

function questionnaireValue(value: unknown): string {
  if (value === null || value === undefined || value === '')
    return 'Brak odpowiedzi';
  if (Array.isArray(value)) return value.join(', ') || 'Brak odpowiedzi';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function FinancialDealFields({
  value,
  onChange,
  contacts,
  primaryContactId,
}: FinancialDealFieldsProps) {
  const [missingItem, setMissingItem] = useState('');
  const [productCode, setProductCode] = useState('');
  const [productAmount, setProductAmount] = useState('');

  const update = (patch: Partial<DealFinancialValues>) => {
    onChange({ ...value, ...patch });
  };

  const availableAdditionalContacts = contacts.filter(
    (contact) =>
      contact.id !== primaryContactId &&
      !value.additionalContactIds.includes(contact.id)
  );

  const addMissingItem = () => {
    if (!missingItem || value.missingItems.includes(missingItem)) return;
    update({ missingItems: [...value.missingItems, missingItem] });
    setMissingItem('');
  };

  const addProduct = () => {
    const amount = Number(productAmount.replace(',', '.'));
    if (!productCode) return;
    update({
      products: [
        ...value.products,
        { code: productCode, amount: Number.isFinite(amount) ? amount : 0 },
      ],
    });
    setProductCode('');
    setProductAmount('');
  };

  return (
    <div className="space-y-3">
      <details open className="border-border bg-muted/20 rounded-lg border">
        <summary className="text-foreground cursor-pointer px-3 py-2 text-sm font-semibold">
          Dane sprawy jak w Bigin
        </summary>
        <div className="border-border/60 space-y-4 border-t p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Firma - nazwa</Label>
              <Input
                value={value.companyName}
                onChange={(event) =>
                  update({ companyName: event.target.value })
                }
                placeholder="Jeżeli sprawa dotyczy firmy"
                className="border-border bg-muted text-foreground"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-muted-foreground">
                Prowizja oczekiwana
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={value.expectedCommission}
                onChange={(event) =>
                  update({ expectedCommission: event.target.value })
                }
                placeholder="0 zł"
                className="border-border bg-muted text-foreground"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-muted-foreground">Dodatkowe kontakty</Label>
            <select
              value=""
              onChange={(event) => {
                if (!event.target.value) return;
                update({
                  additionalContactIds: [
                    ...value.additionalContactIds,
                    event.target.value,
                  ],
                });
              }}
              className={selectClass}
            >
              <option value="">Dodaj drugą osobę</option>
              {availableAdditionalContacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name || contact.phone}
                </option>
              ))}
            </select>
            {value.additionalContactIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {value.additionalContactIds.map((contactId) => {
                  const contact = contacts.find(
                    (item) => item.id === contactId
                  );
                  return (
                    <Badge
                      key={contactId}
                      variant="secondary"
                      className="gap-1"
                    >
                      {contact?.name || contact?.phone || 'Kontakt'}
                      <button
                        type="button"
                        aria-label="Usuń dodatkowy kontakt"
                        onClick={() =>
                          update({
                            additionalContactIds:
                              value.additionalContactIds.filter(
                                (id) => id !== contactId
                              ),
                          })
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Namiar - źródło</Label>
              <select
                value={value.leadSource}
                onChange={(event) => update({ leadSource: event.target.value })}
                className={selectClass}
              >
                <option value="">Wybierz</option>
                {LEAD_SOURCE_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label className="text-muted-foreground">CEL</Label>
              <select
                value={value.financialGoal}
                onChange={(event) =>
                  update({ financialGoal: event.target.value })
                }
                className={selectClass}
              >
                <option value="">Wybierz</option>
                {FINANCIAL_GOAL_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Typ</Label>
              <select
                value={value.dealType}
                onChange={(event) => update({ dealType: event.target.value })}
                className={selectClass}
              >
                <option value="">Wybierz</option>
                {DEAL_TYPE_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-muted-foreground">Kolejny etap</Label>
            <Input
              value={value.nextStep}
              onChange={(event) => update({ nextStep: event.target.value })}
              placeholder="Jedno konkretne następne działanie"
              className="border-border bg-muted text-foreground"
            />
          </div>
        </div>
      </details>

      <details open className="border-border bg-muted/20 rounded-lg border">
        <summary className="text-foreground cursor-pointer px-3 py-2 text-sm font-semibold">
          Ankieta, analiza i spotkanie
        </summary>
        <div className="border-border/60 space-y-4 border-t p-3">
          <div className="grid gap-2 sm:max-w-xs">
            <Label className="text-muted-foreground">Stan ankiety</Label>
            <select
              value={value.questionnaireStatus}
              onChange={(event) =>
                update({
                  questionnaireStatus: event.target
                    .value as DealFinancialValues['questionnaireStatus'],
                })
              }
              className={selectClass}
            >
              {(['not_started', 'partial', 'submitted'] as const).map(
                (status) => (
                  <option key={status} value={status}>
                    {questionnaireStatusLabel(status)}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="grid gap-2">
            <Label className="text-muted-foreground">
              Odpowiedzi z ankiety
            </Label>
            {Object.keys(value.questionnaireData).length === 0 ? (
              <p className="border-border text-muted-foreground rounded-md border border-dashed p-3 text-xs">
                Brak odpowiedzi. Deal można prowadzić dalej, a dane uzupełnić
                przed spotkaniem lub podczas niego.
              </p>
            ) : (
              <dl className="border-border grid gap-2 rounded-md border p-3 text-sm">
                {Object.entries(value.questionnaireData).map(
                  ([key, answer]) => (
                    <div
                      key={key}
                      className="grid gap-1 sm:grid-cols-[180px_1fr]"
                    >
                      <dt className="text-muted-foreground font-medium">
                        {key}
                      </dt>
                      <dd className="text-foreground break-words">
                        {questionnaireValue(answer)}
                      </dd>
                    </div>
                  )
                )}
              </dl>
            )}
          </div>

          <div className="grid gap-2">
            <Label className="text-muted-foreground">Wstępna analiza AI</Label>
            <Textarea
              value={value.aiAnalysis}
              onChange={(event) => update({ aiAnalysis: event.target.value })}
              placeholder="Podsumowanie celu, sytuacji finansowej, ryzyk i pytań na spotkanie"
              className="border-border bg-muted text-foreground min-h-[130px]"
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-muted-foreground">Lista braków</Label>
            <div className="flex gap-2">
              <select
                value={missingItem}
                onChange={(event) => setMissingItem(event.target.value)}
                className={selectClass}
              >
                <option value="">Wybierz brak</option>
                {MISSING_ITEM_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <Button type="button" variant="outline" onClick={addMissingItem}>
                <Plus className="h-4 w-4" />
                Dodaj
              </Button>
            </div>
            {value.missingItems.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {value.missingItems.map((item) => (
                  <Badge key={item} variant="secondary" className="gap-1">
                    {item}
                    <button
                      type="button"
                      aria-label={`Usuń brak: ${item}`}
                      onClick={() =>
                        update({
                          missingItems: value.missingItems.filter(
                            (existing) => existing !== item
                          ),
                        })
                      }
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label className="text-muted-foreground">
              Wnioski ze spotkania
            </Label>
            <Textarea
              value={value.meetingNotes}
              onChange={(event) => update({ meetingNotes: event.target.value })}
              placeholder="Notatka własna lub tekst podyktowany po spotkaniu"
              className="border-border bg-muted text-foreground min-h-[130px]"
            />
          </div>
        </div>
      </details>

      <details className="border-border bg-muted/20 rounded-lg border">
        <summary className="text-foreground cursor-pointer px-3 py-2 text-sm font-semibold">
          Komunikacja, banki i produkty
        </summary>
        <div className="border-border/60 space-y-4 border-t p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Wysyłka WhatsApp</Label>
              <Input
                value={value.whatsappDispatch}
                onChange={(event) =>
                  update({ whatsappDispatch: event.target.value })
                }
                placeholder="Co i kiedy wysłano"
                className="border-border bg-muted text-foreground"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-muted-foreground">FOLDER URL</Label>
              <Input
                type="url"
                value={value.folderUrl}
                onChange={(event) => update({ folderUrl: event.target.value })}
                placeholder="https://drive.google.com/..."
                className="border-border bg-muted text-foreground"
              />
            </div>
          </div>

          {([1, 2, 3] as const).map((number) => {
            const bankKey = `bank${number}` as const;
            const statusKey = `bank${number}Status` as const;
            return (
              <div key={number} className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">BANK {number}</Label>
                  <select
                    value={value[bankKey]}
                    onChange={(event) =>
                      update({ [bankKey]: event.target.value })
                    }
                    className={selectClass}
                  >
                    <option value="">Brak</option>
                    {BANK_OPTIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">
                    Status Bank {number}
                  </Label>
                  <select
                    value={value[statusKey]}
                    onChange={(event) =>
                      update({ [statusKey]: event.target.value })
                    }
                    className={selectClass}
                  >
                    <option value="">Brak</option>
                    {BANK_STATUS_OPTIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}

          <div className="grid gap-2">
            <Label className="text-muted-foreground">Skojarzone produkty</Label>
            <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
              <select
                value={productCode}
                onChange={(event) => setProductCode(event.target.value)}
                className={selectClass}
              >
                <option value="">Wybierz produkt</option>
                {PRODUCT_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <Input
                type="number"
                min="0"
                value={productAmount}
                onChange={(event) => setProductAmount(event.target.value)}
                placeholder="Kwota"
                className="border-border bg-muted text-foreground"
              />
              <Button type="button" variant="outline" onClick={addProduct}>
                <Plus className="h-4 w-4" />
                Dodaj
              </Button>
            </div>
            {value.products.length > 0 && (
              <div className="space-y-2">
                {value.products.map((product, index) => (
                  <div
                    key={`${product.code}-${index}`}
                    className="border-border flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <span className="text-foreground break-all">
                      {product.code} - {product.amount.toLocaleString('pl-PL')}{' '}
                      zł
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Usuń produkt"
                      onClick={() =>
                        update({
                          products: value.products.filter(
                            (_, productIndex) => productIndex !== index
                          ),
                        })
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </details>
    </div>
  );
}

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomMealModal } from './CustomMealModal';

// Mock the useUser hook
const mockDispatch = vi.fn();
vi.mock('../context/UserContext', () => ({
  useUser: () => ({
    state: { selectedDate: '2024-01-01' },
    dispatch: mockDispatch,
  }),
}));

// Mock the useProductSearch hook
const mockSetQuery = vi.fn();
let mockSearchResults: ReturnType<typeof createProduct>[] = [];
let mockLoading = false;
let mockError: string | null = null;

function createProduct(overrides = {}) {
  return {
    id: '1',
    name: 'Jogurt naturalny',
    brand: 'Danone',
    energy_kcal_100g: 61,
    proteins_100g: 4.5,
    carbohydrates_100g: 6.2,
    fat_100g: 1.8,
    servingSize: null,
    servingQuantityG: null,
    ...overrides,
  };
}

vi.mock('../hooks/useProductSearch', () => ({
  useProductSearch: () => ({
    query: '',
    setQuery: mockSetQuery,
    results: mockSearchResults,
    loading: mockLoading,
    error: mockError,
  }),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLProps<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

describe('CustomMealModal', () => {
  beforeEach(() => {
    mockDispatch.mockReset();
    mockSetQuery.mockReset();
    mockSearchResults = [];
    mockLoading = false;
    mockError = null;
  });

  const clickFirstProduct = (name: string) => {
    fireEvent.click(screen.getAllByText(name)[0]);
  };

  it('renders all 5 meal type options', () => {
    render(<CustomMealModal date="2024-01-01" isOpen={true} onClose={() => {}} />);
    expect(screen.getAllByText('Śniadanie')[0]).toBeInTheDocument();
    expect(screen.getAllByText('II Śniadanie')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Obiad')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Przekąska')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Kolacja')[0]).toBeInTheDocument();
  });

  it('defaults to Śniadanie meal type', () => {
    render(<CustomMealModal date="2024-01-01" isOpen={true} onClose={() => {}} />);
    const sniadanieBtn = screen.getAllByText('Śniadanie')[0];
    // The active button has the emerald-600 class
    expect(sniadanieBtn.className).toContain('bg-emerald-600');
  });

  it('has confirm button disabled when no products are selected', () => {
    render(<CustomMealModal date="2024-01-01" isOpen={true} onClose={() => {}} />);
    const confirmBtn = screen.getAllByText('Dodaj posiłek')[0];
    expect(confirmBtn.closest('button')).toBeDisabled();
  });

  it('has confirm button disabled when title is empty and multiple products', () => {
    mockSearchResults = [createProduct(), createProduct({ id: '2', name: 'Mleko' })];
    render(<CustomMealModal date="2024-01-01" isOpen={true} onClose={() => {}} />);

    // Select a product from results
    clickFirstProduct('Jogurt naturalny');
    clickFirstProduct('Mleko');

    // Clear the auto-set title
    const titleInput = screen.getAllByPlaceholderText('np. Śniadanie proteinowe, Sałatka z kurczakiem...')[0];
    fireEvent.change(titleInput, { target: { value: '' } });

    const confirmBtn = screen.getAllByText('Dodaj posiłek')[0];
    expect(confirmBtn.closest('button')).toBeDisabled();
  });

  it('dispatches ADD_MEAL with correct structure on confirm', () => {
    mockSearchResults = [createProduct()];
    render(<CustomMealModal date="2024-01-01" isOpen={true} onClose={() => {}} />);

    // Select product
    clickFirstProduct('Jogurt naturalny');

    // Title auto-set to product name for single product
    // Click confirm
    const confirmBtn = screen.getAllByText('Dodaj posiłek')[0].closest('button')!;
    fireEvent.click(confirmBtn);

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ADD_MEAL',
        date: '2024-01-01',
        meal: expect.objectContaining({
          type: 'Śniadanie',
          title: 'Jogurt naturalny',
          eaten: false,
          instruction: '',
          ingredients: ['Jogurt naturalny - 100g'],
        }),
      })
    );
  });

  it('single-product meal uses product name as default title', () => {
    mockSearchResults = [createProduct()];
    render(<CustomMealModal date="2024-01-01" isOpen={true} onClose={() => {}} />);

    // Select product
    clickFirstProduct('Jogurt naturalny');

    const titleInput = screen.getAllByPlaceholderText('np. Śniadanie proteinowe, Sałatka z kurczakiem...')[0] as HTMLInputElement;
    expect(titleInput.value).toBe('Jogurt naturalny');
  });

  it('displays running macro totals when products are selected', () => {
    mockSearchResults = [createProduct()];
    render(<CustomMealModal date="2024-01-01" isOpen={true} onClose={() => {}} />);

    clickFirstProduct('Jogurt naturalny');

    // Should show "Razem:" with macro values
    expect(screen.getAllByText('Razem:')[0]).toBeInTheDocument();
    expect(screen.getAllByText('61 kcal')[0]).toBeInTheDocument();
  });

  it('allows removing products from composition', () => {
    mockSearchResults = [createProduct()];
    render(<CustomMealModal date="2024-01-01" isOpen={true} onClose={() => {}} />);

    // Select product
    clickFirstProduct('Jogurt naturalny');

    // Product should be in selected list
    expect(screen.getAllByText('Razem:')[0]).toBeInTheDocument();

    // Click remove
    const removeBtn = screen.getAllByLabelText('Usuń produkt')[0];
    fireEvent.click(removeBtn);

    // Macro totals should disappear
    expect(screen.queryByText('Razem:')).not.toBeInTheDocument();
  });
});

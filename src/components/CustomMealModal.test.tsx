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

  it('renders all 5 meal type options', () => {
    render(<CustomMealModal date="2024-01-01" isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('Śniadanie')).toBeInTheDocument();
    expect(screen.getByText('II Śniadanie')).toBeInTheDocument();
    expect(screen.getByText('Obiad')).toBeInTheDocument();
    expect(screen.getByText('Przekąska')).toBeInTheDocument();
    expect(screen.getByText('Kolacja')).toBeInTheDocument();
  });

  it('defaults to Śniadanie meal type', () => {
    render(<CustomMealModal date="2024-01-01" isOpen={true} onClose={() => {}} />);
    const sniadanieBtn = screen.getByText('Śniadanie');
    // The active button has the emerald-600 class
    expect(sniadanieBtn.className).toContain('bg-emerald-600');
  });

  it('has confirm button disabled when no products are selected', () => {
    render(<CustomMealModal date="2024-01-01" isOpen={true} onClose={() => {}} />);
    const confirmBtn = screen.getByText('Dodaj posiłek');
    expect(confirmBtn.closest('button')).toBeDisabled();
  });

  it('has confirm button disabled when title is empty and multiple products', () => {
    mockSearchResults = [createProduct(), createProduct({ id: '2', name: 'Mleko' })];
    render(<CustomMealModal date="2024-01-01" isOpen={true} onClose={() => {}} />);

    // Select a product from results
    fireEvent.click(screen.getByText('Jogurt naturalny'));
    fireEvent.click(screen.getByText('Mleko'));

    // Clear the auto-set title
    const titleInput = screen.getByPlaceholderText('np. Śniadanie proteinowe');
    fireEvent.change(titleInput, { target: { value: '' } });

    const confirmBtn = screen.getByText('Dodaj posiłek');
    expect(confirmBtn.closest('button')).toBeDisabled();
  });

  it('dispatches ADD_MEAL with correct structure on confirm', () => {
    mockSearchResults = [createProduct()];
    render(<CustomMealModal date="2024-01-01" isOpen={true} onClose={() => {}} />);

    // Select product
    fireEvent.click(screen.getByText('Jogurt naturalny'));

    // Title auto-set to product name for single product
    // Click confirm
    const confirmBtn = screen.getByText('Dodaj posiłek').closest('button')!;
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
    fireEvent.click(screen.getByText('Jogurt naturalny'));

    const titleInput = screen.getByPlaceholderText('np. Śniadanie proteinowe') as HTMLInputElement;
    expect(titleInput.value).toBe('Jogurt naturalny');
  });

  it('displays running macro totals when products are selected', () => {
    mockSearchResults = [createProduct()];
    render(<CustomMealModal date="2024-01-01" isOpen={true} onClose={() => {}} />);

    fireEvent.click(screen.getByText('Jogurt naturalny'));

    // Should show "Suma:" with macro values
    expect(screen.getByText('Suma:')).toBeInTheDocument();
    expect(screen.getByText('61 kcal')).toBeInTheDocument();
  });

  it('allows removing products from composition', () => {
    mockSearchResults = [createProduct()];
    render(<CustomMealModal date="2024-01-01" isOpen={true} onClose={() => {}} />);

    // Select product
    fireEvent.click(screen.getByText('Jogurt naturalny'));

    // Product should be in selected list
    expect(screen.getByText('Suma:')).toBeInTheDocument();

    // Click remove
    const removeBtn = screen.getByLabelText('Usuń produkt');
    fireEvent.click(removeBtn);

    // Macro totals should disappear
    expect(screen.queryByText('Suma:')).not.toBeInTheDocument();
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

type HookStateSetter<T> = (value: T | ((current: T) => T)) => void;

function createReactHookMock() {
  let hookIndex = 0;
  const hookState: unknown[] = [];

  return {
    api: {
      forwardRef: (render: unknown) => ({ render }),
      useState<T>(initial: T | (() => T)): [T, HookStateSetter<T>] {
        const index = hookIndex++;

        if (!(index in hookState)) {
          hookState[index] = typeof initial === 'function'
            ? (initial as () => T)()
            : initial;
        }

        const setState: HookStateSetter<T> = (value) => {
          const current = hookState[index] as T;
          hookState[index] = typeof value === 'function'
            ? (value as (current: T) => T)(current)
            : value;
        };

        return [hookState[index] as T, setState];
      },
      useRef<T>(initial: T) {
        const index = hookIndex++;

        if (!(index in hookState)) {
          hookState[index] = { current: initial };
        }

        return hookState[index] as { current: T };
      },
      useEffect: () => {
        hookIndex++;
      },
      useImperativeHandle: (ref: { current: unknown } | null | undefined, create: () => unknown) => {
        hookIndex++;

        if (ref) {
          ref.current = create();
        }
      },
    },
    render<TProps>(component: unknown, props: TProps) {
      hookIndex = 0;
      return (component as { render: (nextProps: TProps, ref: unknown) => unknown }).render(props, null);
    },
    getRef<T>(index: number) {
      return hookState[index] as { current: T };
    },
  };
}

async function loadTimePickerInput() {
  vi.resetModules();

  const reactHookMock = createReactHookMock();

  vi.doMock('react', () => reactHookMock.api);
  vi.doMock('@/lib/utils', () => ({
    cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' '),
  }));

  const module = await import('./time-picker-input');

  return {
    reactHookMock,
    TimePickerInput: module.TimePickerInput,
  };
}

async function loadDatePickerInput() {
  vi.resetModules();

  const reactHookMock = createReactHookMock();

  vi.doMock('react', () => reactHookMock.api);
  vi.doMock('lucide-react', () => ({
    CalendarIcon: () => null,
  }));
  vi.doMock('@/lib/utils', () => ({
    cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' '),
  }));
  vi.doMock('./popover', () => ({
    Popover: ({ children }: { children: unknown }) => children,
    PopoverTrigger: ({ children }: { children: unknown }) => children,
    PopoverContent: ({ children }: { children: unknown }) => children,
  }));
  vi.doMock('./calendar', () => ({
    Calendar: () => null,
  }));

  const module = await import('./date-picker-input');

  return {
    reactHookMock,
    DatePickerInput: module.DatePickerInput,
  };
}

function getTimeSegments(tree: any) {
  return tree.props.children.props.children as Array<any>;
}

function getDateSegments(tree: any) {
  return tree.props.children[0].props.children as Array<any>;
}

function getSegment(tree: any, suffix: string, getSegments: (value: any) => Array<any>) {
  return getSegments(tree).find((segment) => segment.props.suffix === suffix);
}

function createKeyDownEvent(key: string) {
  return {
    key,
    preventDefault: vi.fn(),
  };
}

describe('TimePickerInput', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('ArrowUp / ArrowDown で従来通り時刻を増減できる', async () => {
    const { reactHookMock, TimePickerInput } = await loadTimePickerInput();

    let currentValue = '09:30';
    const onChange = vi.fn((nextValue: string) => {
      currentValue = nextValue;
    });

    let tree = reactHookMock.render(TimePickerInput, { value: currentValue, onChange });

    getSegment(tree, '時', getTimeSegments).props.onKeyDown(createKeyDownEvent('ArrowUp'));
    expect(onChange).toHaveBeenLastCalledWith('10:30');

    tree = reactHookMock.render(TimePickerInput, { value: currentValue, onChange });

    getSegment(tree, '分', getTimeSegments).props.onKeyDown(createKeyDownEvent('ArrowDown'));
    expect(onChange).toHaveBeenLastCalledWith('10:29');
  });

  it('数字入力で時刻変更でき、セグメント移動と exit コールバックも維持される', async () => {
    const { reactHookMock, TimePickerInput } = await loadTimePickerInput();

    let currentValue = '09:30';
    const onChange = vi.fn((nextValue: string) => {
      currentValue = nextValue;
    });
    const onExitLeft = vi.fn();

    let tree = reactHookMock.render(TimePickerInput, { value: currentValue, onChange, onExitLeft });
    const hourRef = reactHookMock.getRef<{ focus: () => void }>(1);
    const minuteRef = reactHookMock.getRef<{ focus: () => void }>(2);
    const focusHour = vi.fn();
    const focusMinute = vi.fn();

    hourRef.current = { focus: focusHour };
    minuteRef.current = { focus: focusMinute };

    getSegment(tree, '時', getTimeSegments).props.onKeyDown(createKeyDownEvent('ArrowRight'));
    expect(focusMinute).toHaveBeenCalledOnce();

    getSegment(tree, '時', getTimeSegments).props.onKeyDown(createKeyDownEvent('ArrowLeft'));
    expect(onExitLeft).toHaveBeenCalledOnce();

    tree = reactHookMock.render(TimePickerInput, { value: currentValue, onChange, onExitLeft });
    getSegment(tree, '分', getTimeSegments).props.onKeyDown(createKeyDownEvent('ArrowLeft'));
    expect(focusHour).toHaveBeenCalledOnce();

    tree = reactHookMock.render(TimePickerInput, { value: currentValue, onChange, onExitLeft });
    getSegment(tree, '時', getTimeSegments).props.onKeyDown(createKeyDownEvent('1'));

    tree = reactHookMock.render(TimePickerInput, { value: currentValue, onChange, onExitLeft });
    getSegment(tree, '時', getTimeSegments).props.onKeyDown(createKeyDownEvent('8'));

    expect(onChange).toHaveBeenLastCalledWith('18:30');
  });

  it('無効な数値は安全に扱われ、確定済みの値は壊さない', async () => {
    const { reactHookMock, TimePickerInput } = await loadTimePickerInput();

    let currentValue = '09:30';
    const onChange = vi.fn((nextValue: string) => {
      currentValue = nextValue;
    });

    let tree = reactHookMock.render(TimePickerInput, { value: currentValue, onChange });
    getSegment(tree, '分', getTimeSegments).props.onKeyDown(createKeyDownEvent('6'));

    expect(onChange).toHaveBeenLastCalledWith('09:06');

    tree = reactHookMock.render(TimePickerInput, { value: currentValue, onChange });
    getSegment(tree, '分', getTimeSegments).props.onKeyDown(createKeyDownEvent('0'));

    expect(onChange).toHaveBeenCalledTimes(1);

    tree = reactHookMock.render(TimePickerInput, { value: currentValue, onChange });
    expect(getSegment(tree, '分', getTimeSegments).props.value).toBe('06');
  });
});

describe('DatePickerInput', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('ArrowUp / ArrowDown で従来通り日付を増減できる', async () => {
    const { reactHookMock, DatePickerInput } = await loadDatePickerInput();

    let currentValue = '2026-05-15';
    const onChange = vi.fn((nextValue: string) => {
      currentValue = nextValue;
    });

    let tree = reactHookMock.render(DatePickerInput, { value: currentValue, onChange });

    getSegment(tree, '日', getDateSegments).props.onKeyDown(createKeyDownEvent('ArrowUp'));
    expect(onChange).toHaveBeenLastCalledWith('2026-05-16');

    tree = reactHookMock.render(DatePickerInput, { value: currentValue, onChange });

    getSegment(tree, '月', getDateSegments).props.onKeyDown(createKeyDownEvent('ArrowDown'));
    expect(onChange).toHaveBeenLastCalledWith('2026-04-16');
  }, 10000);

  it('数字入力で日付変更でき、セグメント移動と exit コールバックも維持される', async () => {
    const { reactHookMock, DatePickerInput } = await loadDatePickerInput();

    let currentValue = '2026-05-15';
    const onChange = vi.fn((nextValue: string) => {
      currentValue = nextValue;
    });
    const onExitRight = vi.fn();

    let tree = reactHookMock.render(DatePickerInput, { value: currentValue, onChange, onExitRight });
    const yearRef = reactHookMock.getRef<{ focus: () => void }>(2);
    const monthRef = reactHookMock.getRef<{ focus: () => void }>(3);
    const dayRef = reactHookMock.getRef<{ focus: () => void }>(4);
    const focusYear = vi.fn();
    const focusMonth = vi.fn();
    const focusDay = vi.fn();

    yearRef.current = { focus: focusYear };
    monthRef.current = { focus: focusMonth };
    dayRef.current = { focus: focusDay };

    getSegment(tree, '年', getDateSegments).props.onKeyDown(createKeyDownEvent('ArrowRight'));
    expect(focusMonth).toHaveBeenCalledOnce();

    getSegment(tree, '月', getDateSegments).props.onKeyDown(createKeyDownEvent('ArrowRight'));
    expect(focusDay).toHaveBeenCalledOnce();

    tree = reactHookMock.render(DatePickerInput, { value: currentValue, onChange, onExitRight });
    getSegment(tree, '日', getDateSegments).props.onKeyDown(createKeyDownEvent('ArrowLeft'));
    expect(focusMonth).toHaveBeenCalledTimes(2);

    tree = reactHookMock.render(DatePickerInput, { value: currentValue, onChange, onExitRight });
    getSegment(tree, '月', getDateSegments).props.onKeyDown(createKeyDownEvent('ArrowLeft'));
    expect(focusYear).toHaveBeenCalledOnce();

    tree = reactHookMock.render(DatePickerInput, { value: currentValue, onChange, onExitRight });
    getSegment(tree, '日', getDateSegments).props.onKeyDown(createKeyDownEvent('ArrowRight'));
    expect(onExitRight).toHaveBeenCalledOnce();

    tree = reactHookMock.render(DatePickerInput, { value: currentValue, onChange, onExitRight });
    getSegment(tree, '月', getDateSegments).props.onKeyDown(createKeyDownEvent('1'));

    tree = reactHookMock.render(DatePickerInput, { value: currentValue, onChange, onExitRight });
    getSegment(tree, '月', getDateSegments).props.onKeyDown(createKeyDownEvent('2'));

    expect(onChange).toHaveBeenLastCalledWith('2026-12-15');
  }, 10000);

  it('無効な数値は安全に扱われ、確定済みの値は壊さない', async () => {
    const { reactHookMock, DatePickerInput } = await loadDatePickerInput();

    let currentValue = '2026-05-15';
    const onChange = vi.fn((nextValue: string) => {
      currentValue = nextValue;
    });

    let tree = reactHookMock.render(DatePickerInput, { value: currentValue, onChange });
    getSegment(tree, '月', getDateSegments).props.onKeyDown(createKeyDownEvent('1'));

    expect(onChange).toHaveBeenLastCalledWith('2026-01-15');

    tree = reactHookMock.render(DatePickerInput, { value: currentValue, onChange });
    getSegment(tree, '月', getDateSegments).props.onKeyDown(createKeyDownEvent('3'));

    expect(onChange).toHaveBeenCalledTimes(1);

    tree = reactHookMock.render(DatePickerInput, { value: currentValue, onChange });
    expect(getSegment(tree, '月', getDateSegments).props.value).toBe('01');
  }, 10000);
});

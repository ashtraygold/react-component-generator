import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptInput } from './PromptInput';

describe('PromptInput', () => {
  it('프롬프트가 비어 있으면 생성 버튼이 비활성이다', () => {
    render(<PromptInput onGenerate={vi.fn()} isLoading={false} />);
    expect(screen.getByRole('button', { name: '컴포넌트 생성' })).toBeDisabled();
  });

  it('입력하면 버튼이 활성화되고 클릭 시 입력값으로 onGenerate가 호출된다', async () => {
    const onGenerate = vi.fn();
    const user = userEvent.setup();
    render(<PromptInput onGenerate={onGenerate} isLoading={false} />);

    await user.type(screen.getByRole('textbox'), '프로필 카드');
    const submit = screen.getByRole('button', { name: '컴포넌트 생성' });
    expect(submit).toBeEnabled();

    await user.click(submit);
    expect(onGenerate).toHaveBeenCalledWith('프로필 카드');
  });

  it('로딩 중에는 생성 버튼이 비활성이고 "생성 중..." 을 보여준다', () => {
    render(<PromptInput onGenerate={vi.fn()} isLoading={true} />);
    expect(screen.getByRole('button', { name: '생성 중...' })).toBeDisabled();
  });

  describe('프롬프트 길이 제한', () => {
    const typeLong = (length: number) => {
      render(<PromptInput onGenerate={vi.fn()} isLoading={false} />);
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '가'.repeat(length) },
      });
    };

    it('입력 중인 글자 수를 "현재/500" 형태로 보여준다', () => {
      typeLong(12);
      expect(screen.getByText('12 / 500')).toBeInTheDocument();
    });

    it('500자까지는 에러 없이 생성 버튼이 활성이다', () => {
      typeLong(500);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: '컴포넌트 생성' })).toBeEnabled();
    });

    it('501자부터는 에러 메시지를 보여주고 생성 버튼이 비활성이다', () => {
      typeLong(501);
      expect(screen.getByRole('alert')).toHaveTextContent(
        '프롬프트는 500자 이하로 입력해주세요. (현재 501자)',
      );
      expect(screen.getByRole('button', { name: '컴포넌트 생성' })).toBeDisabled();
    });

    it('500자를 넘기면 Ctrl+Enter로도 onGenerate가 호출되지 않는다', () => {
      const onGenerate = vi.fn();
      render(<PromptInput onGenerate={onGenerate} isLoading={false} />);
      const textbox = screen.getByRole('textbox');
      fireEvent.change(textbox, { target: { value: '가'.repeat(501) } });
      fireEvent.keyDown(textbox, { key: 'Enter', ctrlKey: true });
      expect(onGenerate).not.toHaveBeenCalled();
    });
  });

  describe('프롬프트 히스토리', () => {
    it('history가 없으면 최근 프롬프트 영역을 보여주지 않는다', () => {
      render(<PromptInput onGenerate={vi.fn()} isLoading={false} />);
      expect(screen.queryByText('최근 프롬프트')).not.toBeInTheDocument();
    });

    it('history 항목을 버튼으로 보여주고 클릭하면 입력창에 채운다', async () => {
      const user = userEvent.setup();
      render(
        <PromptInput onGenerate={vi.fn()} isLoading={false} history={['로그인 폼', '가격표']} />,
      );

      await user.click(screen.getByRole('button', { name: '로그인 폼' }));
      expect(screen.getByRole('textbox')).toHaveValue('로그인 폼');
      expect(screen.getByRole('button', { name: '가격표' })).toBeInTheDocument();
    });
  });
});

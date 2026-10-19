import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentCard } from './ComponentCard';
import type { GeneratedComponent } from '../types';

vi.mock('./LivePreview', () => ({
  LivePreview: ({ code }: { code: string }) => <div data-testid="live-preview">{code}</div>,
}));

const component: GeneratedComponent = {
  id: '1',
  prompt: '버튼 만들어줘',
  code: 'const Button = () => <button />;',
  createdAt: new Date('2024-05-01T10:30:00'),
};

const renderCard = (props: Partial<React.ComponentProps<typeof ComponentCard>> = {}) =>
  render(
    <ComponentCard
      component={component}
      onRemove={vi.fn()}
      onRegenerate={vi.fn()}
      isLoading={false}
      {...props}
    />,
  );

describe('ComponentCard', () => {
  it('기본으로 미리보기 탭을 보여준다', () => {
    renderCard();
    expect(screen.getByTestId('live-preview')).toBeInTheDocument();
  });

  describe('스트리밍', () => {
    it('스트리밍 중이면 코드 탭을 보여주고 미리보기는 렌더하지 않는다', () => {
      renderCard({ streaming: true });
      expect(screen.queryByTestId('live-preview')).not.toBeInTheDocument();
      expect(screen.getByText(component.code)).toBeInTheDocument();
    });

    it('스트리밍 중에는 실시간 생성 중임을 알려준다', () => {
      renderCard({ streaming: true });
      expect(screen.getByRole('status')).toHaveTextContent('코드 생성 중');
    });

    it('스트리밍이 끝나면 미리보기 탭으로 전환된다', () => {
      const { rerender } = renderCard({ streaming: true });
      rerender(
        <ComponentCard
          component={component}
          onRemove={vi.fn()}
          onRegenerate={vi.fn()}
          isLoading={false}
          streaming={false}
        />,
      );
      expect(screen.getByTestId('live-preview')).toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('스트리밍 중에는 미리보기 탭을 누를 수 없다', () => {
      renderCard({ streaming: true });
      expect(screen.getByRole('button', { name: '미리보기' })).toBeDisabled();
    });

    it('스트리밍 중에는 재생성·삭제·새로고침 버튼이 비활성이다', () => {
      renderCard({ streaming: true, isLoading: true });
      expect(screen.getByRole('button', { name: '생성 중...' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '삭제' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '미리보기 새로고침' })).toBeDisabled();
    });

    it('스트리밍이 끝난 뒤에는 사용자가 코드 탭으로 직접 이동할 수 있다', async () => {
      const user = userEvent.setup();
      renderCard();
      await user.click(screen.getByRole('button', { name: '코드' }));
      expect(screen.queryByTestId('live-preview')).not.toBeInTheDocument();
    });
  });
});

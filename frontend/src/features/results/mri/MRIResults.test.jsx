import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MRIResults } from './MRIResults'

// Mock recharts responsive container for jsdom
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  }
})

describe('MRIResults Component', () => {
  const mockMri = {
    stage: 'Mild Demented',
    confidence: 87.5,
    model: 'ResNet-50',
    decision_summary: 'Classification based on hippocampal atrophy patterns.',
    gradcam_image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    gradcam_heatmap: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    mri_image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    probabilities: {
      'Non Demented': 4.2,
      'Very Mild Demented': 8.3,
      'Mild Demented': 87.5,
    },
    heatmap_explanation: 'Hippocampus activation detected.',
  }

  it('renders null if mri is null or empty', () => {
    const { container } = render(<MRIResults mri={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders summary mode with detected stage and confidence', () => {
    render(<MRIResults mri={mockMri} />)

    expect(screen.getByText('MRI Classification')).toBeDefined()
    expect(screen.getByText('Mild Demented')).toBeDefined()
    expect(screen.getByText('87.5%')).toBeDefined()
    expect(screen.getByText('ResNet-50')).toBeDefined()
    expect(screen.getByText('Hippocampus activation detected.')).toBeDefined()
  })

  it('switches to interactive 3D / NiiVue viewer mode on tab click', () => {
    render(<MRIResults mri={mockMri} />)

    const interactiveBtn = screen.getByRole('button', { name: /Interactive 3D \/ NiiVue Viewer/i })
    fireEvent.click(interactiveBtn)

    expect(screen.getByText(/3D Neuroimaging & Saliency Explorer/i)).toBeDefined()
    expect(screen.getByText(/Patient Grad-CAM Inspector/i)).toBeDefined()
    expect(screen.getByText(/NiiVue 3D Multi-Planar/i)).toBeDefined()
    expect(screen.getByText(/Grad-CAM Opacity/i)).toBeDefined()
  })

  it('allows switching to NiiVue 3D multi-planar tab inside viewer', () => {
    render(<MRIResults mri={mockMri} />)

    // Switch to interactive view
    fireEvent.click(screen.getByRole('button', { name: /Interactive 3D \/ NiiVue Viewer/i }))

    // Click NiiVue 3D Multi-Planar tab
    fireEvent.click(screen.getByRole('button', { name: /NiiVue 3D Multi-Planar/i }))

    expect(screen.getByText('Multi-Planar')).toBeDefined()
    expect(screen.getByText('3D Raycast Render')).toBeDefined()
    expect(screen.getByText('Crosshairs')).toBeDefined()
    expect(screen.getByText('Colorbar')).toBeDefined()
  })
})

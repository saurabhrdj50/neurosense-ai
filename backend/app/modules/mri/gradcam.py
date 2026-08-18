import io
import base64
from typing import Optional, TYPE_CHECKING

import numpy as np
import torch
import torch.nn as nn
from PIL import Image

if TYPE_CHECKING:
    from app.modules.mri.model import AlzheimerModel


class GradCAMExtractor:
    def generate(
        self,
        model: 'AlzheimerModel',
        image_path: str,
        target_class: int
    ) -> Optional[str]:
        try:
            import matplotlib
            matplotlib.use('Agg')
            import matplotlib.pyplot as plt
            import matplotlib.cm as cm
        except ImportError:
            return None
        
        try:
            from torchvision import transforms
            image = Image.open(image_path).convert('RGB')
            original_size = image.size
            
            transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ])
            
            tensor = transform(image).unsqueeze(0)
            tensor.requires_grad_(True)
            
            target_layer = self._find_conv_layer(model)
            if target_layer is None:
                return None
            
            activations = []
            gradients = []
            
            def fwd_hook(module, inp, out):
                activations.append(out.detach())
            
            def bwd_hook(module, gi, go):
                gradients.append(go[0].detach())
            
            fwd_handle = target_layer.register_forward_hook(fwd_hook)
            bwd_handle = target_layer.register_full_backward_hook(bwd_hook)
            
            model.eval()
            logits = model(tensor)
            probs = torch.softmax(logits, dim=1)
            pred_class = probs.argmax().item() if target_class < 0 else target_class
            
            model.zero_grad()
            logits[0, pred_class].backward()
            
            fwd_handle.remove()
            bwd_handle.remove()
            
            if not activations or not gradients:
                return None
            
            act = activations[0].squeeze(0)
            grad = gradients[0].squeeze(0)
            weights = grad.mean(dim=(1, 2))
            cam = (weights[:, None, None] * act).sum(dim=0)
            cam = torch.nn.functional.relu(cam)
            cam = cam - cam.min()
            max_val = cam.max()
            if max_val > 0:
                cam = cam / max_val
            cam_np = cam.cpu().numpy()
            
            cam_resized = np.array(
                Image.fromarray((cam_np * 255).astype(np.uint8)).resize(
                    original_size, Image.BILINEAR
                )
            ) / 255.0
            
            colormap = cm.get_cmap('jet')
            heatmap = colormap(cam_resized)[:, :, :3]
            original_np = np.array(image.resize(original_size)) / 255.0
            
            overlay = 0.55 * original_np + 0.45 * heatmap
            overlay = np.clip(overlay, 0, 1)
            
            fig, ax = plt.subplots(1, 1, figsize=(5, 5), dpi=100)
            ax.imshow(overlay)
            ax.axis('off')
            fig.tight_layout(pad=0)
            
            buf = io.BytesIO()
            fig.savefig(buf, format='png', bbox_inches='tight', pad_inches=0, dpi=100)
            plt.close(fig)
            buf.seek(0)
            
            return base64.b64encode(buf.read()).decode('utf-8')
            
        except Exception:
            return None
    
    def _find_conv_layer(self, model: nn.Module) -> Optional[nn.Conv2d]:
        for module in reversed(list(model.modules())):
            if isinstance(module, nn.Conv2d):
                return module
        return None

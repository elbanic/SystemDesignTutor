"""
Response formatting for System Design Tutor
Parses LLM output into structured format
"""
import json
import re
import sys
from typing import Dict, Any, List
from datetime import datetime


def _log(msg: str):
    """Log to stderr for immediate visibility."""
    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    sys.stderr.write(f"[{timestamp}] [DEBUG] {msg}\n")
    sys.stderr.flush()


class CoreModule:
    """Represents a core module in system design."""
    def __init__(
        self, 
        name: str, 
        description: str, 
        concepts: str = "",
        concepts_guide: Dict[str, str] = None,
        sample_code: str = ""
    ):
        self.name = name
        self.description = description
        self.concepts = concepts
        self.concepts_guide = concepts_guide or {}
        self.sample_code = sample_code
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "concepts": self.concepts,
            "concepts_guide": self.concepts_guide,
            "sample_code": self.sample_code
        }


class LearningStep:
    """Represents a learning step in the tutoring path."""
    def __init__(self, step: int, topic: str, teaching_points: List[str], exercises: List[str]):
        self.step = step
        self.topic = topic
        self.teaching_points = teaching_points
        self.exercises = exercises
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "step": self.step,
            "topic": self.topic,
            "teaching_points": self.teaching_points,
            "exercises": self.exercises
        }


class ResponseFormatter:
    """Format LLM responses into structured system design guidance."""
    
    @staticmethod
    def parse_response(raw_response: str) -> Dict[str, Any]:
        """Parse LLM output into structured format.
        
        Args:
            raw_response: Raw text response from LLM
            
        Returns:
            Structured response dictionary
        """
        _log("Starting response parsing...")
        
        # Try to extract JSON if present
        json_match = re.search(r'\{.*\}', raw_response, re.DOTALL)
        if json_match:
            try:
                parsed = json.loads(json_match.group())
                _log("Successfully parsed JSON response")
                return parsed
            except json.JSONDecodeError:
                _log("JSON parsing failed, falling back to text parsing")
        
        # Fallback: Parse text sections
        _log("Using text section parsing")
        result = ResponseFormatter._parse_text_sections(raw_response)
        _log(f"Parsed sections: {list(result.keys())}")
        return result
    
    @staticmethod
    def _parse_text_sections(text: str) -> Dict[str, Any]:
        """Parse text response into sections.
        
        Args:
            text: Raw text response
            
        Returns:
            Structured response with sections
        """
        sections = {
            "high_level": "",
            "low_level": "",
            "core_modules": [],
            "next_steps": []
        }
        
        # Extract high-level design
        high_level_match = re.search(
            r'(?:high[- ]level|architecture|overview).*?:\s*(.*?)(?=\n\n|\n#|low[- ]level|$)',
            text,
            re.IGNORECASE | re.DOTALL
        )
        if high_level_match:
            sections["high_level"] = high_level_match.group(1).strip()
            _log(f"Extracted high_level ({len(sections['high_level'])} chars)")
        else:
            _log("No high_level section found")
        
        # Extract low-level design
        low_level_match = re.search(
            r'(?:low[- ]level|implementation|technical details).*?:\s*(.*?)(?=\n\n|\n#|core modules|$)',
            text,
            re.IGNORECASE | re.DOTALL
        )
        if low_level_match:
            sections["low_level"] = low_level_match.group(1).strip()
            _log(f"Extracted low_level ({len(sections['low_level'])} chars)")
        else:
            _log("No low_level section found")
        
        # Extract core modules - try multiple patterns
        modules_section = re.search(
            r'(?:###\s*3\.\s*Core Modules|### Core Modules|Core Modules:?)\s*(.*?)(?=###\s*\d+\.|### |$)',
            text,
            re.IGNORECASE | re.DOTALL
        )
        if modules_section:
            _log("Found core modules section, parsing...")
            module_text = modules_section.group(1)
            _log(f"Module section preview (first 200 chars): {module_text[:200]}")
            sections["core_modules"] = ResponseFormatter._parse_modules(module_text)
            _log(f"Extracted {len(sections['core_modules'])} modules")
        else:
            _log("No core modules section found")
            _log(f"Text preview for debugging (first 500 chars): {text[:500]}")
        
        # Extract learning steps
        steps_section = re.search(
            r'(?:learning path|next steps|steps).*?:\s*(.*?)$',
            text,
            re.IGNORECASE | re.DOTALL
        )
        if steps_section:
            _log("Found learning steps section, parsing...")
            sections["next_steps"] = ResponseFormatter._parse_steps(steps_section.group(1))
            _log(f"Extracted {len(sections['next_steps'])} steps")
        else:
            _log("No learning steps section found")
        
        return sections
    
    @staticmethod
    def _parse_modules(text: str) -> List[Dict[str, Any]]:
        """Parse core modules from text.
        
        Args:
            text: Text containing module descriptions
            
        Returns:
            List of module dictionaries
        """
        modules = []
        
        # Look for numbered modules: **1. Module Name**
        # The format from LLM is: **1. Real-Time Messaging**  
        module_pattern = r'\*\*(\d+)\.\s+([^*\n]+?)\s*\*\*\s*\n(.*?)(?=\n\*\*\d+\.\s+|$)'
        matches = list(re.finditer(module_pattern, text, re.DOTALL))
        
        _log(f"Found {len(matches)} module matches with pattern")
        
        if not matches:
            _log(f"No modules matched. Text sample:\n{text[:500]}")
        
        for match in matches:
            name = match.group(2).strip()
            content = match.group(3).strip()
            
            _log(f"Parsing module: {name}")
            
            # Extract description (text before "Concepts:" or first newline after initial text)
            desc_match = re.search(r'Description:\s*([^\n]+(?:\n(?!Concepts:)[^\n]+)*)', content, re.IGNORECASE)
            if desc_match:
                description = desc_match.group(1).strip()
            else:
                # Fallback: take first paragraph
                desc_match = re.match(r'^([^\n]+(?:\n(?!Concepts?:|Sample Code:)[^\n]+)*)', content, re.DOTALL)
                description = desc_match.group(1).strip() if desc_match else content[:200]
            
            # Extract concepts
            concepts = ""
            concepts_match = re.search(r'Concepts?:\s*([^\n]+)', content, re.IGNORECASE)
            if concepts_match:
                concepts = concepts_match.group(1).strip()
                _log(f"Found concepts: {concepts}")
            else:
                _log(f"No concepts found for {name}")
            
            # Extract concepts guide
            concepts_guide = {}
            guide_match = re.search(r'Concepts? Guide:\s*(.*?)(?=Sample Code:|$)', content, re.IGNORECASE | re.DOTALL)
            if guide_match:
                guide_text = guide_match.group(1)
                # Parse bullet points with concept name and description
                guide_items = re.finditer(r'[-*]\s*([^:]+):\s*([^\n]+)', guide_text)
                for item in guide_items:
                    concept_name = item.group(1).strip()
                    concept_desc = item.group(2).strip()
                    concepts_guide[concept_name] = concept_desc
                _log(f"Found {len(concepts_guide)} concept guides")
            else:
                _log(f"No concepts guide found for {name}")
            
            # Extract sample code
            sample_code = ""
            code_match = re.search(r'Sample Code:\s*```[\w]*\n(.*?)```', content, re.DOTALL)
            if code_match:
                sample_code = code_match.group(1).strip()
                _log(f"Found sample code ({len(sample_code)} chars)")
            else:
                _log(f"No sample code found for {name}")
            
            module = CoreModule(name, description, concepts, concepts_guide, sample_code)
            modules.append(module.to_dict())
        
        return modules
    
    @staticmethod
    def _parse_steps(text: str) -> List[Dict[str, Any]]:
        """Parse learning steps from text.
        
        Args:
            text: Text containing learning steps
            
        Returns:
            List of step dictionaries
        """
        steps = []
        
        # Look for numbered steps
        step_pattern = r'(?:^|\n)(\d+)\.\s*\*\*([^*]+)\*\*:?\s*(.*?)(?=\n\d+\.|$)'
        matches = re.finditer(step_pattern, text, re.DOTALL)
        
        for match in matches:
            step_num = int(match.group(1))
            topic = match.group(2).strip()
            content = match.group(3).strip()
            
            # Extract teaching points
            teaching_points = []
            teaching_match = re.search(r'teaching points?:\s*(.*?)(?=exercises?:|$)', content, re.IGNORECASE | re.DOTALL)
            if teaching_match:
                points_text = teaching_match.group(1)
                teaching_points = [p.strip('- *') for p in points_text.split('\n') if p.strip()]
            
            # Extract exercises
            exercises = []
            exercise_match = re.search(r'exercises?:\s*(.*?)$', content, re.IGNORECASE | re.DOTALL)
            if exercise_match:
                exercise_text = exercise_match.group(1)
                exercises = [e.strip('- *') for e in exercise_text.split('\n') if e.strip()]
            
            step = LearningStep(step_num, topic, teaching_points, exercises)
            steps.append(step.to_dict())
        
        return steps
    
    @staticmethod
    def validate_response(response: Dict[str, Any]) -> tuple[bool, str]:
        """Validate response contains all required sections.
        
        Args:
            response: Structured response dictionary
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        required_keys = ["high_level", "low_level", "core_modules", "next_steps"]
        
        missing_keys = []
        for key in required_keys:
            if key not in response:
                missing_keys.append(key)
        
        if missing_keys:
            return False, f"Missing required keys: {', '.join(missing_keys)}"
        
        # Validate core_modules has at least 3 modules
        if not isinstance(response["core_modules"], list):
            return False, "core_modules must be a list"
        
        if len(response["core_modules"]) < 3:
            return False, f"core_modules must have at least 3 modules, found {len(response['core_modules'])}"
        
        # Validate next_steps is a list
        if not isinstance(response["next_steps"], list):
            return False, "next_steps must be a list"
        
        _log(f"Validation passed: {len(response['core_modules'])} modules, {len(response['next_steps'])} steps")
        return True, ""
    
    @staticmethod
    def format_response(response: Dict[str, Any]) -> Dict[str, Any]:
        """Format and validate final response structure.
        
        Args:
            response: Parsed response dictionary
            
        Returns:
            Formatted response with success flag
        """
        is_valid, error_msg = ResponseFormatter.validate_response(response)
        if not is_valid:
            _log(f"Validation failed: {error_msg}")
            _log(f"Response keys: {list(response.keys())}")
            return {
                "success": False,
                "error": f"Response validation failed: {error_msg}"
            }
        
        return {
            "success": True,
            "content": {
                "high_level": response["high_level"],
                "low_level": response["low_level"],
                "core_modules": response["core_modules"],
                "next_steps": response["next_steps"]
            }
        }
